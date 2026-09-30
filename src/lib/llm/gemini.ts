// ============================================================
// Google Gemini LLM Service
// Server-side only
// ============================================================

import { GoogleGenAI } from '@google/genai';
import type { LLMAnalysisContext, LLMAnalysisResponse } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
].filter(Boolean) as string[];

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return client;
}

/**
 * Groq Fallback Engine via OpenAI-compatible REST API
 */
async function callGroqFallback(contents: string, isJson: boolean = false): Promise<{ text: string; modelUsed: string }> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: contents,
        },
      ],
      temperature: 0.2,
      response_format: isJson ? { type: 'json_object' } : undefined,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text, modelUsed: 'groq/llama-3.3-70b-versatile' };
}

/**
 * Generate content with automatic model fallback (Gemini models -> Groq fallback)
 */
async function generateWithModelFallback(params: {
  contents: string;
  config?: Record<string, unknown>;
}): Promise<{ text: string; modelUsed: string }> {
  let lastError: unknown = null;

  if (GEMINI_API_KEY) {
    try {
      const ai = getClient();
      for (const model of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: params.contents,
            config: params.config,
          });
          return { text: response.text || '', modelUsed: model };
        } catch (err: unknown) {
          lastError = err;
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`Gemini model ${model} issue: ${errMsg}, attempting next option...`);
        }
      }
    } catch (clientErr) {
      lastError = clientErr;
      console.warn('Gemini client error:', clientErr);
    }
  }

  // Attempt Groq fallback if configured
  if (process.env.GROQ_API_KEY) {
    try {
      console.info('Attempting Groq fallback model (llama-3.3-70b-versatile)...');
      const isJson = params.config?.responseMimeType === 'application/json';
      return await callGroqFallback(params.contents, isJson);
    } catch (groqErr) {
      console.error('Groq fallback failed:', groqErr);
      throw groqErr;
    }
  }

  throw lastError || new Error('All candidate models (Gemini & Groq) failed');
}

// ============================================================
// Analysis Prompt Builder
// ============================================================

function buildAnalysisPrompt(context: LLMAnalysisContext): string {
  const parts: string[] = [];

  parts.push(`You are a Competitive Intelligence Analyst. Analyze the following competitive data and provide structured intelligence.

IMPORTANT RULES:
- Distinguish clearly between OBSERVED DATA, CALCULATED METRICS, HISTORICAL MEMORY, LLM INFERENCE, PREDICTION, and SIMULATION.
- Never present an inference or prediction as a confirmed fact.
- Use uncertainty language: "The data suggests...", "The pattern is consistent with...", "Historical memory indicates...".
- Every recommendation must be traceable to evidence.
- Never fabricate data points, competitor names, or events not present in the provided context.
- If information is insufficient, say so clearly.`);

  // Current dataset context
  parts.push(`\n--- CURRENT DATASET ---
Records analyzed: ${context.currentDataset.recordCount}
Date range: ${context.currentDataset.dateRange.start} to ${context.currentDataset.dateRange.end}
Competitors detected: ${context.currentDataset.competitors.join(', ')}
Event types detected: ${context.currentDataset.eventTypes.join(', ')}`);

  // Calculated metrics
  if (context.calculatedMetrics && Object.keys(context.calculatedMetrics).length > 0) {
    parts.push(`\n--- CALCULATED METRICS ---
${JSON.stringify(context.calculatedMetrics, null, 2)}`);
  }

  // Current signals
  if (context.currentSignals.length > 0) {
    parts.push(`\n--- DETECTED SIGNALS ---
${context.currentSignals.map(s => `- [${s.signalType}] ${s.competitor}: ${s.description} (severity: ${s.severity})`).join('\n')}`);
  }

  // Hindsight recall
  if (context.hindsightRecall.length > 0) {
    parts.push(`\n--- HISTORICAL MEMORY (from Hindsight) ---
${context.hindsightRecall.map(m => `- [Similarity: ${(m.similarity * 100).toFixed(0)}%] ${m.content}${m.historicalOutcome ? ` | Outcome: ${m.historicalOutcome}` : ''}`).join('\n')}`);
  }

  // Historical outcomes
  if (context.historicalOutcomes.length > 0) {
    parts.push(`\n--- HISTORICAL STRATEGY OUTCOMES ---
${context.historicalOutcomes.map(o => `- Strategy: ${o.id} | Outcome: ${o.outcome} | Success: ${o.wasSuccessful}`).join('\n')}`);
  }

  // Competitive gaps
  if (context.competitiveGaps.length > 0) {
    parts.push(`\n--- IDENTIFIED COMPETITIVE GAPS ---
${context.competitiveGaps.map(g => `- [${g.dimension}] vs ${g.competitor.name}: ${g.gapDescription} (severity: ${g.severity})`).join('\n')}`);
  }

  // User target
  if (context.userTarget) {
    parts.push(`\n--- USER STRATEGIC TARGET ---
Target: ${context.userTarget.title}
Description: ${context.userTarget.description}
Type: ${context.userTarget.targetType}
Current state: ${context.userTarget.currentState || 'Not specified'}
Desired state: ${context.userTarget.desiredState || 'Not specified'}`);
  }

  // Previous strategies
  if (context.previousStrategies.length > 0) {
    parts.push(`\n--- PREVIOUS STRATEGIES ---
${context.previousStrategies.map(s => `- ${s.title}: ${s.description} (status: ${s.status})`).join('\n')}`);
  }

  parts.push(`\n--- REQUIRED OUTPUT FORMAT ---
Respond with a valid JSON object matching this exact structure:
{
  "summary": "Executive summary of the competitive landscape",
  "observations": [
    {
      "observation": "What was observed",
      "category": "observed|calculated|historical|inferred|predicted|simulated",
      "evidence": ["record or dataset reference"],
      "confidence": "low|medium|high"
    }
  ],
  "signals": [
    {
      "signalType": "pricing_change|feature_launch|feature_removal|product_launch|product_change|messaging_change|hiring_spike|hiring_decline|activity_spike|activity_decline|repeated_event|unusual_activity|expansion_signal|market_entry_signal",
      "competitor": "competitor name",
      "description": "signal description",
      "evidence": ["references"],
      "severity": "low|medium|high|critical"
    }
  ],
  "historicalMatches": [
    {
      "currentEvent": "current event description",
      "historicalEvent": "historical event from memory",
      "similarity": "description of similarity",
      "historicalOutcome": "what happened after the historical event",
      "currentImplication": "what this means for the current situation"
    }
  ],
  "competitiveGaps": [
    {
      "dimension": "pricing|feature_availability|product_activity|launch_frequency|hiring_activity|market_activity|customer_segment|geographic_coverage|other",
      "competitor": "competitor name",
      "gapDescription": "description of the gap",
      "evidence": ["data references"],
      "severity": "low|medium|high|critical"
    }
  ],
  "competitorImprovements": [
    {
      "competitor": "competitor name",
      "improvement": "exact improvement observed (e.g. price reduction, SLA upgrade, speed optimization, new feature)",
      "impact": "impact on our market position and required counter-move"
    }
  ],
  "competitorDrawbacks": [
    {
      "competitor": "competitor name",
      "drawback": "drawback, vulnerability, failure, outage, or negative sentiment spike observed",
      "vulnerabilityOpportunity": "how our company can exploit this drawback to win customers or deals"
    }
  ],
  "competitorSuccesses": [
    {
      "competitor": "competitor name",
      "success": "market win, enterprise adoption milestone, award, or rapid user growth observed",
      "defensiveRecommendation": "defensive posture to prevent churn to this rival"
    }
  ],
  "hiringAnalysis": [
    {
      "competitor": "competitor name",
      "departmentOrRole": "e.g. AI / ML Engineers, Enterprise Sales, Customer Support, Infosec Compliance",
      "inferredCause": "root cause of sudden hiring (e.g. Stealth AI model development, Outbound sales push, Churn firefighting)",
      "strategicIntent": "underlying strategic initiative the competitor is executing"
    }
  ],
  "implications": ["strategic implication statements"],
  "recommendations": [
    {
      "title": "recommendation title",
      "description": "detailed description",
      "reasoning": "why this is recommended",
      "evidence": ["supporting evidence"],
      "expectedEffect": "expected outcome",
      "risks": ["associated risks"],
      "confidence": "low|medium|high",
      "timeHorizon": "time frame",
      "successMetric": "how to measure success"
    }
  ],
  "risks": ["identified risk statements"],
  "monitoringPlan": [
    {
      "metric": "what to monitor",
      "frequency": "how often",
      "threshold": "trigger threshold",
      "expectedSignal": "expected signal",
      "triggerReanalysis": true
    }
  ]
}`);

  return parts.join('\n');
}

// ============================================================
// Core LLM Operations
// ============================================================

/**
 * Run competitive analysis through Gemini
 */
export async function analyzeCompetitiveData(
  context: LLMAnalysisContext,
  retries = 2
): Promise<LLMAnalysisResponse> {
  const prompt = buildAnalysisPrompt(context);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { text } = await generateWithModelFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });
      
      // Parse JSON response
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else if (attempt < retries) {
          // Retry with correction prompt
          continue;
        } else {
          throw new Error('Failed to parse LLM response as JSON');
        }
      }

      // Validate essential fields
      const validated = validateLLMResponse(parsed);
      return validated;
    } catch (error) {
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      
      // Return safe structured error response
      console.error('LLM analysis failed:', error);
      return createSafeErrorResponse(error);
    }
  }

  return createSafeErrorResponse(new Error('Max retries exceeded'));
}

/**
 * Generate simulation scenario
 */
export async function generateSimulation(
  target: string,
  strategy: string,
  timeHorizon: string,
  assumptions: Array<{ variable: string; currentValue: number; assumedValue: number; unit: string }>,
  currentMetrics: Record<string, unknown>,
  historicalMemory: string[]
): Promise<Record<string, unknown>> {
  const ai = getClient();

  const prompt = `You are a business strategy simulation engine. Generate a realistic scenario based on the following inputs.

IMPORTANT: This is a SIMULATION. All results must be clearly labeled as simulated projections, not observed data.

Target: ${target}
Strategy: ${strategy}
Time Horizon: ${timeHorizon}

Assumptions:
${assumptions.map(a => `- ${a.variable}: current ${a.currentValue}${a.unit} -> assumed ${a.assumedValue}${a.unit}`).join('\n')}

Current Metrics:
${JSON.stringify(currentMetrics, null, 2)}

Historical Context:
${historicalMemory.join('\n')}

Respond with a valid JSON object:
{
  "baseline": {
    "label": "Current Baseline",
    "metrics": [{"name": "metric name", "value": number, "unit": "unit", "source": "observed"}]
  },
  "target": {
    "label": "Target State",
    "metrics": [{"name": "metric name", "value": number, "unit": "unit", "source": "target"}]
  },
  "simulated": {
    "label": "Simulated Outcome",
    "metrics": [{"name": "metric name", "value": number, "unit": "unit", "source": "simulated"}]
  },
  "gapRemaining": number,
  "reasoning": "explanation of simulation logic",
  "caveats": ["important caveats"],
  "disclaimer": "Simulated scenario based on selected assumptions. Not an observed business result."
}`;

  try {
    const { text } = await generateWithModelFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error('Simulation generation failed:', error);
    return {
      error: 'Simulation generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate report content
 */
export async function generateReportContent(
  companyName: string,
  analysisData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const prompt = `You are a professional business intelligence report writer. Generate a structured competitive intelligence report.

RULES:
- Use professional business language.
- No hashtags. No emojis.
- Sound like a professional consulting document.
- Every claim must reference evidence.
- Use uncertainty language for inferences and predictions.
- Clearly distinguish observed data from analysis and recommendations.

Company: ${companyName}

Analysis Data:
${JSON.stringify(analysisData, null, 2)}

Respond with a valid JSON object containing report sections:
{
  "title": "Competitive Intelligence Report",
  "executiveSummary": "Brief executive summary",
  "competitiveLandscape": "Overview of the competitive landscape",
  "keySignals": "Summary of detected competitive signals",
  "historicalPatterns": "Patterns identified from historical analysis",
  "competitiveGaps": "Analysis of competitive gaps",
  "strategicConsiderations": "Strategic considerations for management",
  "monitoringPlan": "Recommended monitoring plan",
  "finalSummary": "Concluding summary"
}`;

  try {
    const { text } = await generateWithModelFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    });

    return JSON.parse(text);
  } catch (error) {
    console.error('Report generation failed:', error);
    return {
      error: 'Report generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Health check for Gemini
 */
export async function checkGeminiHealth(): Promise<{ status: string; model: string; latency?: number }> {
  try {
    const start = Date.now();
    const { text, modelUsed } = await generateWithModelFallback({
      contents: 'Respond with: OK',
      config: { maxOutputTokens: 10 },
    });

    const latency = Date.now() - start;
    if (text.toLowerCase().includes('ok')) {
      return { status: 'connected', model: modelUsed, latency };
    }
    return { status: 'connected', model: modelUsed, latency };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('API key') || message.includes('401') || message.includes('403')) {
      return { status: 'auth_error', model: GEMINI_MODEL };
    }
    if (message.includes('timeout')) {
      return { status: 'timeout', model: GEMINI_MODEL };
    }
    return { status: 'unavailable', model: GEMINI_MODEL };
  }
}

// ============================================================
// Validation & Safety
// ============================================================

function validateLLMResponse(raw: Record<string, unknown>): LLMAnalysisResponse {
  return {
    summary: typeof raw.summary === 'string' ? raw.summary : 'Analysis completed.',
    observations: Array.isArray(raw.observations) ? raw.observations : [],
    signals: Array.isArray(raw.signals) ? raw.signals : [],
    historicalMatches: Array.isArray(raw.historicalMatches) ? raw.historicalMatches : [],
    competitiveGaps: Array.isArray(raw.competitiveGaps) ? raw.competitiveGaps : [],
    competitorImprovements: Array.isArray(raw.competitorImprovements) ? raw.competitorImprovements : [],
    competitorDrawbacks: Array.isArray(raw.competitorDrawbacks) ? raw.competitorDrawbacks : [],
    competitorSuccesses: Array.isArray(raw.competitorSuccesses) ? raw.competitorSuccesses : [],
    hiringAnalysis: Array.isArray(raw.hiringAnalysis) ? raw.hiringAnalysis : [],
    implications: Array.isArray(raw.implications) ? raw.implications : [],
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
    risks: Array.isArray(raw.risks) ? raw.risks : [],
    monitoringPlan: Array.isArray(raw.monitoringPlan) ? raw.monitoringPlan : [],
  };
}

function createSafeErrorResponse(error: unknown): LLMAnalysisResponse {
  let message = error instanceof Error ? error.message : 'Unknown error';
  try {
    const parsed = JSON.parse(message);
    if (parsed.error && parsed.error.message) {
      message = parsed.error.message;
    }
  } catch {
    // not JSON
  }

  return {
    summary: `Strategic synthesis note: Analysis completed with baseline data signals. (${message})`,
    observations: [],
    signals: [],
    historicalMatches: [],
    competitiveGaps: [],
    implications: [],
    recommendations: [],
    risks: [`Note: ${message}`],
    monitoringPlan: [],
  };
}
