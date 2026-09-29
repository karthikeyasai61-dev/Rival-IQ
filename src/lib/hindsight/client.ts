// ============================================================
// Hindsight API Client
// Server-side only - Never expose API key to browser
// ============================================================

const HINDSIGHT_BASE_URL = process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io';
const HINDSIGHT_API_KEY = process.env.HINDSIGHT_API_KEY || '';

let cachedBankId: string | null = null;

export async function getActiveBankId(): Promise<string> {
  if (cachedBankId) return cachedBankId;
  const envBank = process.env.HINDSIGHT_BANK_ID;
  if (envBank && envBank !== 'signalforge-ci' && envBank !== 'rivaliq-ci') {
    cachedBankId = envBank;
    return cachedBankId;
  }
  try {
    const data = await hindsightRequest<{ banks: Array<{ bank_id: string }> }>('/v1/default/banks', 'GET');
    if (data.banks && data.banks.length > 0) {
      cachedBankId = data.banks[0].bank_id;
      return cachedBankId;
    }
  } catch (e) {
    console.warn('Bank discovery fallback:', e);
  }
  cachedBankId = 'compi-agent';
  return cachedBankId;
}

interface HindsightRetainOptions {
  content: string;
  metadata?: Record<string, unknown>;
}

interface HindsightRecallOptions {
  query: string;
  top_k?: number;
  include_chunks?: boolean;
}

interface HindsightReflectOptions {
  query: string;
}

interface HindsightMemory {
  id: string;
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

interface HindsightRecallResponse {
  results: HindsightMemory[];
}

interface HindsightRetainResponse {
  operation_id?: string;
  status?: string;
}

interface HindsightReflectResponse {
  content: string;
  sources?: HindsightMemory[];
}

interface HindsightHealthResponse {
  status: string;
  bank_id?: string;
  stats?: Record<string, unknown>;
}

// Base request helper
async function hindsightRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
  retries = 2
): Promise<T> {
  if (!HINDSIGHT_API_KEY) {
    throw new Error('HINDSIGHT_API_KEY is not configured');
  }

  const url = `${HINDSIGHT_BASE_URL}${endpoint}`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${HINDSIGHT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        // Retry on 429 or 5xx
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`Hindsight API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (attempt < retries && error instanceof TypeError) {
        // Network error, retry
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Hindsight API: Max retries exceeded');
}

// ============================================================
// Core Operations
// ============================================================

/**
 * Retain: Store content in Hindsight memory
 */
export async function retain(options: HindsightRetainOptions): Promise<HindsightRetainResponse> {
  const bankId = await getActiveBankId();
  
  return hindsightRequest<HindsightRetainResponse>(
    `/v1/default/banks/${bankId}/memories`,
    'POST',
    {
      async: false,
      items: [
        {
          content: options.content,
          context: (options.metadata?.context as string) || 'competitor_intelligence',
          metadata: options.metadata || {},
        },
      ],
    }
  );
}

function extractStringList(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'canonical_name' in item) {
          return String((item as Record<string, unknown>).canonical_name);
        }
        if (item && typeof item === 'object' && 'name' in item) {
          return String((item as Record<string, unknown>).name);
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof input === 'object') {
    return Object.keys(input);
  }
  if (typeof input === 'string') {
    return [input];
  }
  return [];
}

/**
 * Recall: Retrieve relevant memories
 */
export async function recall(options: HindsightRecallOptions): Promise<HindsightRecallResponse> {
  const bankId = await getActiveBankId();

  const res = await hindsightRequest<{
    results?: Array<{
      id: string;
      text?: string;
      content?: string;
      score?: number;
      scores?: { final?: number; semantic?: number; reranker?: number };
      entities?: unknown;
      tags?: unknown;
      context?: string;
      occurred_start?: string;
      metadata?: Record<string, unknown>;
    }>;
  }>(
    `/v1/default/banks/${bankId}/memories/recall`,
    'POST',
    {
      query: options.query,
      top_k: options.top_k || 15,
      include_chunks: options.include_chunks ?? true,
    }
  );

  return {
    results: (res.results || []).map((r) => ({
      id: r.id,
      content: r.text || r.content || '',
      score: r.scores?.final ?? r.score,
      metadata: {
        context: r.context,
        entities: extractStringList(r.entities),
        tags: extractStringList(r.tags),
        occurred_start: r.occurred_start,
        ...(r.metadata || {}),
      },
    })),
  };
}

/**
 * Reflect: Synthesize knowledge from memory
 */
export async function reflect(options: HindsightReflectOptions): Promise<HindsightReflectResponse> {
  const bankId = await getActiveBankId();

  return hindsightRequest<HindsightReflectResponse>(
    `/v1/default/banks/${bankId}/reflect`,
    'POST',
    {
      query: options.query,
    }
  );
}

/**
 * List memories
 */
export async function listMemories(limit = 50, offset = 0): Promise<{ memories: HindsightMemory[]; total?: number }> {
  const bankId = await getActiveBankId();

  const res = await hindsightRequest<{
    items?: Array<{
      id: string;
      text?: string;
      content?: string;
      date?: string;
      context?: string;
      fact_type?: string;
      entities?: unknown;
      tags?: unknown;
      metadata?: Record<string, unknown>;
    }>;
    memories?: HindsightMemory[];
    total?: number;
  }>(
    `/v1/default/banks/${bankId}/memories/list?limit=${limit}&offset=${offset}`,
    'GET'
  );

  if (res.items) {
    return {
      total: res.total ?? res.items.length,
      memories: res.items.map((item) => ({
        id: item.id,
        content: item.text || item.content || '',
        created_at: item.date,
        metadata: {
          context: item.context,
          fact_type: item.fact_type,
          entities: extractStringList(item.entities),
          tags: extractStringList(item.tags),
          ...(item.metadata || {}),
        },
      })),
    };
  }

  return {
    total: res.memories?.length || 0,
    memories: res.memories || [],
  };
}

/**
 * Get Bank Graph Statistics
 */
export async function getBankStats(): Promise<Record<string, unknown>> {
  const bankId = await getActiveBankId();
  return hindsightRequest<Record<string, unknown>>(
    `/v1/default/banks/${bankId}/stats`,
    'GET'
  );
}

/**
 * Health check
 */
export async function checkHealth(): Promise<HindsightHealthResponse> {
  try {
    const bankId = await getActiveBankId();
    const stats = await hindsightRequest<Record<string, unknown>>(
      `/v1/default/banks/${bankId}/stats`,
      'GET'
    );
    return {
      bank_id: bankId,
      status: 'connected',
      stats,
    };
  } catch (error) {
    console.error('Hindsight health check error:', error);
    try {
      const data = await hindsightRequest<{ banks: Array<{ bank_id: string }> }>('/v1/default/banks', 'GET');
      if (data.banks && data.banks.length > 0) {
        cachedBankId = data.banks[0].bank_id;
        return { bank_id: cachedBankId, status: 'connected' };
      }
    } catch {
      // ignore
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('API key') || message.includes('401') || message.includes('403')) {
      return { status: 'auth_error' };
    }
    if (message.includes('timeout') || message.includes('AbortError')) {
      return { status: 'timeout' };
    }
    return { status: 'unavailable' };
  }
}

// ============================================================
// Memory Service (Business-level operations)
// ============================================================

export interface CompetitorMemoryPayload {
  workspaceId: string;
  competitorId: string;
  competitorName: string;
  eventType: string;
  eventDate: string;
  description: string;
  sourceDataset: string;
  sourceRecordIds: string[];
  observedMetrics?: Record<string, unknown>;
  analysisId?: string;
  strategyId?: string;
  outcome?: string;
}

/**
 * Retain a competitor event as a structured memory
 */
export async function retainCompetitorEvent(payload: CompetitorMemoryPayload): Promise<HindsightRetainResponse> {
  const content = buildMemoryContent(payload);
  
  return retain({
    content,
    metadata: {
      workspaceId: payload.workspaceId,
      competitorId: payload.competitorId,
      competitorName: payload.competitorName,
      eventType: payload.eventType,
      eventDate: payload.eventDate,
      sourceDataset: payload.sourceDataset,
      sourceRecordIds: payload.sourceRecordIds,
      analysisId: payload.analysisId,
      strategyId: payload.strategyId,
      outcome: payload.outcome,
      retainedAt: new Date().toISOString(),
    },
  });
}

/**
 * Recall historical events related to a competitor or event type
 */
export async function recallCompetitorHistory(
  competitorName: string,
  eventDescription: string,
  topK = 10
): Promise<HindsightRecallResponse> {
  const query = `Competitor: ${competitorName}. Event: ${eventDescription}. What happened previously that is similar?`;
  
  return recall({
    query,
    top_k: topK,
    include_chunks: true,
  });
}

/**
 * Recall memories for strategic reasoning
 */
export async function recallForStrategy(
  currentSignals: string[],
  competitorNames: string[],
  topK = 15
): Promise<HindsightRecallResponse> {
  const signalsSummary = currentSignals.join('; ');
  const competitorsSummary = competitorNames.join(', ');
  
  const query = `Current competitive signals: ${signalsSummary}. Competitors: ${competitorsSummary}. What historical patterns, outcomes, and strategic decisions are relevant?`;

  return recall({
    query,
    top_k: topK,
    include_chunks: true,
  });
}

/**
 * Retain a strategy outcome for future learning
 */
export async function retainStrategyOutcome(
  workspaceId: string,
  strategyId: string,
  strategyDescription: string,
  outcome: string,
  wasSuccessful: boolean
): Promise<HindsightRetainResponse> {
  const content = `Strategy: ${strategyDescription}. Outcome: ${outcome}. Result: ${wasSuccessful ? 'Successful' : 'Unsuccessful'}.`;
  
  return retain({
    content,
    metadata: {
      workspaceId,
      strategyId,
      type: 'strategy_outcome',
      wasSuccessful,
      recordedAt: new Date().toISOString(),
    },
  });
}

/**
 * Reflect on accumulated competitive intelligence
 */
export async function reflectOnCompetitor(competitorName: string): Promise<HindsightReflectResponse> {
  return reflect({
    query: `Summarize all known competitive intelligence about ${competitorName}, including historical events, patterns, outcomes, and strategic implications.`,
  });
}

// ============================================================
// Helpers
// ============================================================

function buildMemoryContent(payload: CompetitorMemoryPayload): string {
  const parts: string[] = [
    `Competitor: ${payload.competitorName}`,
    `Event Type: ${payload.eventType}`,
    `Date: ${payload.eventDate}`,
    `Description: ${payload.description}`,
  ];

  if (payload.observedMetrics) {
    const metricsStr = Object.entries(payload.observedMetrics)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    parts.push(`Metrics: ${metricsStr}`);
  }

  if (payload.outcome) {
    parts.push(`Outcome: ${payload.outcome}`);
  }

  parts.push(`Source: ${payload.sourceDataset}`);

  return parts.join('. ');
}

export type { HindsightMemory, HindsightRecallResponse, HindsightRetainResponse, HindsightReflectResponse };
