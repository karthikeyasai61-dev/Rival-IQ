// ============================================================
// RivalIQ - Core TypeScript Types
// ============================================================

// Product configuration
export const PRODUCT_NAME = 'RivalIQ';
export const PRODUCT_TAGLINE = 'Turn competitor activity into strategic action.';

// ============================================================
// User & Workspace
// ============================================================

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  companyName: string;
  industry?: string;
  organizationScale?: string;
  organizationType?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  hindsightBankId?: string;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'analyst' | 'viewer';
  joinedAt: string;
}

// ============================================================
// Dataset & Records
// ============================================================

export type DatasetStatus = 'uploading' | 'parsing' | 'validating' | 'ready' | 'error';
export type FileType = 'csv' | 'xlsx' | 'json' | 'pdf' | 'txt';

export interface Dataset {
  id: string;
  workspaceId: string;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
  processingStatus: DatasetStatus;
  recordCount: number;
  validRecordCount: number;
  invalidRecordCount: number;
  duplicateRecordCount: number;
  schema: ColumnSchema[];
  columnMapping: ColumnMapping[];
  dateRange?: { start: string; end: string };
  detectedCompetitors: string[];
  detectedEventTypes: string[];
  analysisStatus: 'pending' | 'analyzing' | 'analyzed' | 'error';
  errorMessage?: string;
  dataType?: 'user_company' | 'competition' | string;
}

export interface ColumnSchema {
  name: string;
  detectedType: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: SemanticField | null;
  confidence: number;
  isUserOverridden: boolean;
}

export type SemanticField =
  | 'competitor'
  | 'date'
  | 'eventType'
  | 'price'
  | 'product'
  | 'feature'
  | 'description'
  | 'source'
  | 'region'
  | 'segment'
  | 'channel'
  | 'metric'
  | 'value'
  | 'category'
  | 'sentiment'
  | 'url';

export interface DatasetRecord {
  id: string;
  datasetId: string;
  workspaceId: string;
  rowIndex: number;
  rawData: Record<string, unknown>;
  normalizedData: NormalizedRecord;
  isValid: boolean;
  validationErrors: string[];
  isDuplicate: boolean;
}

export interface NormalizedRecord {
  competitor?: string;
  date?: string;
  eventType?: string;
  price?: number;
  product?: string;
  feature?: string;
  description?: string;
  source?: string;
  region?: string;
  segment?: string;
  channel?: string;
  metric?: string;
  value?: number;
  category?: string;
  [key: string]: unknown;
}

// ============================================================
// Competitors
// ============================================================

export interface Competitor {
  id: string;
  workspaceId: string;
  name: string;
  normalizedName: string;
  aliases: string[];
  recordCount: number;
  eventCount: number;
  activityLevel: 'low' | 'moderate' | 'high' | 'very_high';
  latestEventDate?: string;
  lastAnalyzedAt?: string;
  historicalMemoryCount: number;
  firstSeenAt: string;
  datasetIds: string[];
}

export interface CompetitorEvent {
  id: string;
  workspaceId: string;
  competitorId: string;
  competitorName: string;
  datasetId: string;
  recordIds: string[];
  eventType: EventType;
  eventDate: string;
  description: string;
  metadata: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export type EventType =
  | 'pricing_change'
  | 'feature_launch'
  | 'feature_removal'
  | 'product_launch'
  | 'product_change'
  | 'messaging_change'
  | 'hiring_spike'
  | 'hiring_decline'
  | 'activity_spike'
  | 'activity_decline'
  | 'market_entry'
  | 'geographic_expansion'
  | 'campaign_launch'
  | 'segment_change'
  | 'partnership'
  | 'acquisition'
  | 'competitor_improvement'
  | 'competitor_drawback_failure'
  | 'competitor_success'
  | 'sudden_hiring_cause'
  | 'other';

// ============================================================
// Signals
// ============================================================

export interface Signal {
  id: string;
  workspaceId: string;
  analysisId: string;
  signalType: SignalType;
  competitor: string;
  competitorId: string;
  eventDate: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence: SignalEvidence[];
  calculatedChange?: {
    metric: string;
    previousValue: number;
    currentValue: number;
    changePercent: number;
    direction: 'increase' | 'decrease' | 'stable';
  };
  hiringCause?: string;
  strategicIntent?: string;
  impactOnOurCompany?: string;
  intelligenceCategory?: 'improvement' | 'drawback_failure' | 'success' | 'hiring_cause' | 'general';
  sourceRecordIds: string[];
  historicalMatch?: HindsightMatch;
  createdAt: string;
}

export type SignalType =
  | 'pricing_change'
  | 'feature_launch'
  | 'feature_removal'
  | 'product_launch'
  | 'product_change'
  | 'messaging_change'
  | 'hiring_spike'
  | 'hiring_decline'
  | 'activity_spike'
  | 'activity_decline'
  | 'repeated_event'
  | 'unusual_activity'
  | 'expansion_signal'
  | 'market_entry_signal'
  | 'competitor_improvement'
  | 'competitor_drawback_failure'
  | 'competitor_success'
  | 'sudden_hiring_cause';

export interface SignalEvidence {
  recordId: string;
  datasetId: string;
  datasetName: string;
  field: string;
  value: string;
  date?: string;
}

// ============================================================
// Analysis
// ============================================================

export type AnalysisStatus = 'pending' | 'uploading' | 'parsing' | 'validating' | 'analyzing' | 'recalling_memory' | 'reasoning' | 'calculating' | 'generating' | 'complete' | 'error';

export interface Analysis {
  id: string;
  workspaceId: string;
  datasetIds: string[];
  status: AnalysisStatus;
  currentStep: string;
  analysisPeriod: { start: string; end: string };
  engineVersion: string;
  createdAt: string;
  completedAt?: string;
  competitorsAnalyzed: number;
  signalsDetected: number;
  gapsIdentified: number;
  recommendationsGenerated: number;
  memoriesRecalled: number;
  memoriesRetained: number;
  errorMessage?: string;
  configuration: AnalysisConfiguration;
}

export interface AnalysisConfiguration {
  period: AnalysisPeriod;
  targetCompetitors?: string[];
  signalTypes?: SignalType[];
  includeHistoricalMemory: boolean;
  target?: StrategicTarget;
}

export type AnalysisPeriod = '7d' | '30d' | '90d' | '6m' | '12m' | 'custom';

// ============================================================
// Hindsight Memory
// ============================================================

export interface HindsightMemoryReference {
  id: string;
  workspaceId: string;
  hindsightMemoryId: string;
  bankId: string;
  eventType: EventType;
  competitorId?: string;
  competitorName?: string;
  eventDate?: string;
  sourceDataset?: string;
  sourceRecordIds: string[];
  content: string;
  metadata: Record<string, unknown>;
  analysisId?: string;
  strategyId?: string;
  outcome?: string;
  retainedAt: string;
  lastRecalledAt?: string;
  recallCount: number;
}

export interface HindsightMatch {
  memoryId: string;
  content: string;
  similarity: number;
  eventDate?: string;
  eventType?: string;
  competitor?: string;
  historicalOutcome?: string;
  currentImplication?: string;
}

export interface HindsightRecallResult {
  query: string;
  results: HindsightMatch[];
  totalResults: number;
  recalledAt: string;
}

// ============================================================
// Competitive Gaps
// ============================================================

export interface CompetitiveGap {
  id: string;
  workspaceId: string;
  analysisId: string;
  dimension: GapDimension;
  ourCompany: {
    value: number | string;
    evidence: string[];
  };
  competitor: {
    name: string;
    competitorId: string;
    value: number | string;
    evidence: string[];
  };
  gapDescription: string;
  gapMagnitude: number;
  direction: 'behind' | 'ahead' | 'neutral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  historicalContext?: string;
  potentialImplication: string;
  sourceRecordIds: string[];
  datasetIds: string[];
  createdAt: string;
}

export type GapDimension =
  | 'pricing'
  | 'feature_availability'
  | 'product_activity'
  | 'launch_frequency'
  | 'hiring_activity'
  | 'market_activity'
  | 'customer_segment'
  | 'geographic_coverage'
  | 'other';

// ============================================================
// Recommendations
// ============================================================

export interface Recommendation {
  id: string;
  workspaceId: string;
  analysisId: string;
  title: string;
  description: string;
  reasoning: string;
  evidenceIds: string[];
  historicalMemoryIds: string[];
  expectedEffect: string;
  risks: string[];
  dependencies: string[];
  successMetric: string;
  confidence: 'low' | 'medium' | 'high';
  confidenceRationale: string;
  timeHorizon: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: RecommendationCategory;
  monitoringPlan: MonitoringItem[];
  createdAt: string;
}

export type RecommendationCategory =
  | 'pricing'
  | 'product'
  | 'feature'
  | 'market'
  | 'hiring'
  | 'messaging'
  | 'defensive'
  | 'offensive'
  | 'monitoring';

export interface MonitoringItem {
  metric: string;
  frequency: string;
  threshold: string;
  expectedSignal: string;
  triggerReanalysis: boolean;
}

// ============================================================
// Strategy
// ============================================================

export interface StrategicTarget {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  targetType: TargetType;
  currentState?: string;
  desiredState?: string;
  createdAt: string;
}

export type TargetType =
  | 'market_presence'
  | 'competitive_gap'
  | 'product_differentiation'
  | 'pricing_response'
  | 'feature_coverage'
  | 'customer_retention'
  | 'launch_velocity'
  | 'custom';

export interface Strategy {
  id: string;
  workspaceId: string;
  targetId: string;
  title: string;
  description: string;
  actions: StrategyAction[];
  expectedOutcome: string;
  risks: string[];
  timeHorizon: string;
  status: 'proposed' | 'active' | 'completed' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}

export interface StrategyAction {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface StrategyOutcome {
  id: string;
  strategyId: string;
  workspaceId: string;
  outcome: string;
  measuredResult: string;
  wasSuccessful: boolean | null;
  recordedAt: string;
  hindsightMemoryId?: string;
}

// ============================================================
// Simulation
// ============================================================

export interface Simulation {
  id: string;
  workspaceId: string;
  analysisId: string;
  targetId?: string;
  strategyDescription: string;
  timeHorizon: string;
  assumptions: SimulationAssumption[];
  baseline: SimulationScenario;
  target: SimulationScenario;
  simulated: SimulationScenario;
  gapRemaining: number;
  disclaimer: string;
  createdAt: string;
}

export interface SimulationAssumption {
  id: string;
  variable: string;
  currentValue: number;
  assumedValue: number;
  unit: string;
  rationale: string;
}

export interface SimulationScenario {
  label: string;
  metrics: SimulationMetric[];
}

export interface SimulationMetric {
  name: string;
  value: number;
  unit: string;
  source: 'observed' | 'calculated' | 'simulated' | 'target';
}

// ============================================================
// Reports
// ============================================================

export interface Report {
  id: string;
  workspaceId: string;
  analysisId: string;
  title: string;
  generatedAt: string;
  generatedBy: string;
  companyName: string;
  analysisPeriod: { start: string; end: string };
  datasetIds: string[];
  sections: ReportSection[];
  pdfStoragePath?: string;
  status: 'generating' | 'ready' | 'error';
}

export interface ReportSection {
  id: string;
  title: string;
  type: ReportSectionType;
  content: string;
  data?: Record<string, unknown>;
  chartConfig?: Record<string, unknown>;
}

export type ReportSectionType =
  | 'executive_summary'
  | 'competitive_landscape'
  | 'signals'
  | 'historical_patterns'
  | 'competitive_gaps'
  | 'growth_opportunities'
  | 'strategic_considerations'
  | 'target_strategy'
  | 'hindsight_intelligence'
  | 'evidence_traceability'
  | 'simulation'
  | 'simulation_assumptions'
  | 'simulation_results'
  | 'monitoring_plan'
  | 'final_summary';

// ============================================================
// Agent & Audit
// ============================================================

export interface AgentRun {
  id: string;
  workspaceId: string;
  analysisId: string;
  agentType: AgentType;
  status: 'running' | 'completed' | 'error';
  startedAt: string;
  completedAt?: string;
  inputSummary: string;
  outputSummary?: string;
  errorMessage?: string;
  duration?: number;
}

export type AgentType =
  | 'data_agent'
  | 'signal_agent'
  | 'memory_agent'
  | 'analysis_agent'
  | 'strategy_agent'
  | 'simulation_agent'
  | 'report_agent';

export interface AuditEvent {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

// ============================================================
// Data Quality
// ============================================================

export interface DataQualityReport {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  missingFields: { field: string; count: number; percentage: number }[];
  duplicateRecords: number;
  dateRange: { start: string; end: string } | null;
  detectedCompetitors: string[];
  detectedEventTypes: string[];
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  severity: 'warning' | 'error';
  field: string;
  message: string;
  affectedRecords: number;
}

// ============================================================
// LLM
// ============================================================

export interface LLMAnalysisContext {
  currentDataset: {
    recordCount: number;
    dateRange: { start: string; end: string };
    competitors: string[];
    eventTypes: string[];
  };
  calculatedMetrics: Record<string, unknown>;
  currentSignals: Signal[];
  hindsightRecall: HindsightMatch[];
  historicalOutcomes: StrategyOutcome[];
  competitiveGaps: CompetitiveGap[];
  userTarget?: StrategicTarget;
  previousStrategies: Strategy[];
}

export interface LLMAnalysisResponse {
  summary: string;
  observations: LLMObservation[];
  signals: LLMSignalSuggestion[];
  historicalMatches: LLMHistoricalMatch[];
  competitiveGaps: LLMGapSuggestion[];
  competitorImprovements?: Array<{ competitor: string; improvement: string; impact: string }>;
  competitorDrawbacks?: Array<{ competitor: string; drawback: string; vulnerabilityOpportunity: string }>;
  competitorSuccesses?: Array<{ competitor: string; success: string; defensiveRecommendation: string }>;
  hiringAnalysis?: Array<{ competitor: string; departmentOrRole: string; inferredCause: string; strategicIntent: string }>;
  implications: string[];
  recommendations: LLMRecommendation[];
  risks: string[];
  monitoringPlan: MonitoringItem[];
}

export interface LLMObservation {
  observation: string;
  category: 'observed' | 'calculated' | 'historical' | 'inferred' | 'predicted' | 'simulated';
  evidence: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface LLMSignalSuggestion {
  signalType: SignalType;
  competitor: string;
  description: string;
  evidence: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface LLMHistoricalMatch {
  currentEvent: string;
  historicalEvent: string;
  similarity: string;
  historicalOutcome: string;
  currentImplication: string;
}

export interface LLMGapSuggestion {
  dimension: string;
  competitor: string;
  gapDescription: string;
  evidence: string[];
  severity: string;
}

export interface LLMRecommendation {
  title: string;
  description: string;
  reasoning: string;
  evidence: string[];
  expectedEffect: string;
  risks: string[];
  confidence: 'low' | 'medium' | 'high';
  timeHorizon: string;
  successMetric: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================
// UI State Types
// ============================================================

export type EvidenceCategory = 'observed' | 'calculated' | 'historical' | 'inferred' | 'predicted' | 'simulated';

export interface FilterState {
  dateRange?: { start: string; end: string };
  competitors?: string[];
  eventTypes?: EventType[];
  signalTypes?: SignalType[];
  severity?: ('low' | 'medium' | 'high' | 'critical')[];
  datasetIds?: string[];
}

export interface HealthStatus {
  service: 'firebase' | 'hindsight' | 'llm';
  status: 'connected' | 'unavailable' | 'auth_error' | 'timeout' | 'config_error';
  latency?: number;
  message?: string;
  checkedAt: string;
}
