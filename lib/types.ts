/**
 * Premium Controlling Engine - Type Definitions
 * 
 * Core types for the DuckDB-based controlling system
 */

// ============================================
// DATA LAYER TYPES
// ============================================

export interface Booking {
  posting_date: string;
  amount: number;
  account: number;
  account_name: string;
  cost_center?: string;
  profit_center?: string;
  vendor?: string;
  customer?: string;
  document_no: string;
  text: string;
}

export interface DataProfile {
  rowCount: number;
  uniqueAccounts: number;
  uniqueCostCenters: number;
  uniqueDocuments: number;
  dateRange: {
    min: string;
    max: string;
  };
  totals: {
    all: number;
    credits: number;
    debits: number;
    balanced: boolean;
  };
  quality: {
    nullAmounts: number;
    nullDates: number;
    nullAccounts: number;
    duplicateDocuments: number;
    outlierCount: number;
  };
  warnings: string[];
}

export interface TimeSeriesPoint {
  period: string;
  value: number;
  transactionCount: number;
  uniqueAccounts: number;
}

// ============================================
// ANALYSIS TYPES
// ============================================

export interface VarianceResult {
  dimension: string;
  key: string;
  label: string;
  amountPrev: number;
  amountCurr: number;
  deltaAbs: number;
  deltaPct: number;
  bookingsPrev: number;
  bookingsCurr: number;
}

export interface VarianceDriver {
  dimension: string;
  key: string;
  contribution: number;
  contributionPct: number;
}

export interface DecomposedVariance {
  totalVariance: number;
  drivers: VarianceDriver[];
  coverage: number; // % of variance explained by top drivers
}

export interface AccountDeviation {
  account: number;
  account_name: string;
  amount_prev: number;
  amount_curr: number;
  delta_abs: number;
  delta_pct: number;
  bookings_count_prev: number;
  bookings_count_curr: number;
  comment: string;
  top_bookings?: TopBooking[];
  top_bookings_curr?: TopBooking[];
  top_bookings_prev?: TopBooking[];
  new_bookings?: TopBooking[];
  missing_bookings?: TopBooking[];
  drivers?: VarianceDriver[];
  anomalyHint?: string;
  anomalyType?: 'seasonal' | 'outlier' | 'trend_break' | 'unusual_single';
  anomalySeverity?: 'info' | 'warning' | 'critical';
}

export interface TopBooking {
  date: string;
  amount: number;
  document_no: string;
  text: string;
  vendor?: string;
  customer?: string;
}

export interface CostCenterDeviation {
  cost_center: string;
  amount_prev: number;
  amount_curr: number;
  delta_abs: number;
  delta_pct: number;
}

// ============================================
// ANALYSIS RESULT TYPES
// ============================================

export interface AnalysisResult {
  meta: {
    period_prev: string;
    period_curr: string;
    bookings_prev: number;
    bookings_curr: number;
    total_prev: number;
    total_curr: number;
    analyzed_at: string;
    engine_version: string;
  };
  summary: {
    total_delta: number;
    erloese_prev: number;
    erloese_curr: number;
    aufwendungen_prev: number;
    aufwendungen_curr: number;
  };
  by_account: AccountDeviation[];
  by_cost_center: CostCenterDeviation[];
  data_quality: {
    prev: DataProfile;
    curr: DataProfile;
  };
}

export interface TripleAnalysisResult {
  meta: {
    period_vj: string;
    period_plan: string;
    period_ist: string;
    total_vj: number;
    total_plan: number;
    total_ist: number;
    analyzed_at: string;
  };
  summary: {
    total_delta_plan: number;
    total_delta_vj: number;
    plan_achievement_pct: number;
  };
  traffic_light: {
    green: number;
    yellow: number;
    red: number;
  };
  by_account: TripleAccountDeviation[];
}

export interface TripleAccountDeviation {
  account: number;
  account_name: string;
  amount_vj: number;
  amount_plan: number;
  amount_ist: number;
  delta_plan_abs: number;
  delta_plan_pct: number;
  delta_vj_abs: number;
  delta_vj_pct: number;
  plan_vs_vj_abs: number;
  plan_vs_vj_pct: number;
  status: 'on_track' | 'over_plan' | 'under_plan' | 'critical';
  comment: string;
  bookings_count_ist?: number;
  top_bookings_ist?: TopBooking[];
}

// ============================================
// AGENT / TOOL TYPES
// ============================================

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  executionTimeMs?: number;
  error?: string;
}

export interface AnalysisPlan {
  query: string;
  intent: 'variance' | 'drill_down' | 'forecast' | 'anomaly' | 'general';
  steps: PlanStep[];
  estimatedCalls: number;
}

export interface PlanStep {
  step: number;
  action: string;
  tool: string;
  rationale: string;
  dependsOn?: number[];
}

export interface AgentResponse {
  answer: string;
  confidence: number;
  sources: Source[];
  toolCalls: ToolCall[];
  plan?: AnalysisPlan;
}

export interface Source {
  type: 'query' | 'document' | 'calculation';
  reference: string;
  excerpt?: string;
}

// ============================================
// KNOWLEDGE LAYER TYPES
// ============================================

export interface AccountKnowledge {
  account: number;
  account_name: string;
  category: 'revenue' | 'expense' | 'asset' | 'liability';
  typical_behavior: string;
  seasonality?: string;
  benchmarks?: {
    revenueRatio?: { min: number; max: number };
    absoluteThreshold?: number;
  };
  related_accounts?: number[];
}

export interface PolicyDocument {
  id: string;
  title: string;
  type: 'guideline' | 'definition' | 'process';
  sections: PolicySection[];
  indexed_at: string;
}

export interface PolicySection {
  id: string;
  title: string;
  content: string;
  page?: number;
  parent_id?: string;
}

// ============================================
// UI / STATE TYPES
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isLoading?: boolean;
  toolCalls?: ToolCall[];
  sources?: Source[];
}

export interface SavedAnalysis {
  id: string;
  name: string;
  entity: string;
  period_prev: string;
  period_curr: string;
  created_at: string;
  workflow_status: 'draft' | 'review' | 'approved';
  result: AnalysisResult;
  kpis?: LabKPIs;
}

export interface LabKPIs {
  revenue_prev: number;
  revenue_curr: number;
  revenue_delta: number;
  personnel_costs_prev: number;
  personnel_costs_curr: number;
  personnel_ratio_prev: number;
  personnel_ratio_curr: number;
  reagent_costs_prev: number;
  reagent_costs_curr: number;
  reagent_ratio_prev: number;
  reagent_ratio_curr: number;
  total_costs_prev: number;
  total_costs_curr: number;
  cost_per_test_prev?: number;
  cost_per_test_curr?: number;
  test_count_prev?: number;
  test_count_curr?: number;
}

// ============================================
// API TYPES
// ============================================

export interface UploadResponse {
  success: boolean;
  tableName: string;
  profile: DataProfile;
  rowCount: number;
}

export interface AnalyzeRequest {
  tablePrev: string;
  tableCurr: string;
  options?: {
    wesentlichkeit_abs?: number;
    wesentlichkeit_pct?: number;
    include_drivers?: boolean;
    max_accounts?: number;
  };
}

export interface SQLQueryRequest {
  sql: string;
  explain?: boolean;
}

export interface SQLQueryResponse {
  success: boolean;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

// ============================================
// EVALUATION TYPES
// ============================================

export interface EvaluationResult {
  sqlCorrectness: {
    syntaxValid: boolean;
    executionSuccess: boolean;
    resultMatches?: boolean;
  };
  groundedness: {
    totalClaims: number;
    supportedClaims: number;
    unsupportedClaims: number;
    score: number;
  };
  driverQuality?: {
    varianceCovered: number;
    topDriversStable: boolean;
  };
}
