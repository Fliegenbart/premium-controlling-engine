export interface Booking {
  posting_date: string;
  amount: number;
  account: number;
  account_name: string;
  cost_center: string;
  profit_center: string;
  vendor: string | null;
  customer: string | null;
  document_no: string;
  text: string;
  entity?: string; // Für Multi-Entity Support
}

export interface AccountDeviation {
  account: number;
  account_name: string;
  amount_prev: number;
  amount_curr: number;
  delta_abs: number;
  delta_pct: number;
  comment: string;
  top_bookings?: TopBooking[];
  // Enhanced evidence tracking
  top_bookings_prev?: TopBooking[];  // Top 10 Buchungen Vorjahr
  top_bookings_curr?: TopBooking[];  // Top 10 Buchungen Aktuell
  new_bookings?: TopBooking[];       // Buchungen die es im VJ nicht gab
  missing_bookings?: TopBooking[];   // Buchungen die es im AJ nicht mehr gibt
  bookings_count_prev?: number;      // Anzahl Buchungen Vorjahr
  bookings_count_curr?: number;      // Anzahl Buchungen Aktuell
  // Anomaly detection fields
  anomalyHint?: string;
  anomalyType?: 'seasonal' | 'outlier' | 'trend_break' | 'unusual_single';
  anomalySeverity?: 'info' | 'warning' | 'critical';
}

export interface CostCenterDeviation {
  cost_center: string;
  amount_prev: number;
  amount_curr: number;
  delta_abs: number;
  delta_pct: number;
  top_accounts: {
    account: number;
    account_name: string;
    delta_abs: number;
  }[];
}

export interface DetailDeviation {
  account: number;
  account_name: string;
  cost_center: string;
  amount_prev: number;
  amount_curr: number;
  delta_abs: number;
  delta_pct: number;
  comment: string;
}

export interface TopBooking {
  date: string;
  amount: number;
  text: string;
  vendor: string | null;
  customer: string | null;
  document_no: string;
}

export interface AnalysisResult {
  meta: {
    period_prev: string;
    period_curr: string;
    total_prev: number;
    total_curr: number;
    bookings_prev: number;
    bookings_curr: number;
    wesentlichkeit_abs: number;
    wesentlichkeit_pct: number;
    entity?: string;
    analyzed_at?: string;
    engine_version?: string;
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
  by_detail: DetailDeviation[];
}

export interface AnalysisConfig {
  wesentlichkeit_abs: number;
  wesentlichkeit_pct: number;
  period_prev_name: string;
  period_curr_name: string;
}

// Multi-Entity Types
export interface EntityFile {
  name: string;
  prevFile: File | null;
  currFile: File | null;
}

export interface EntityResult {
  entity: string;
  result: AnalysisResult;
  status: 'success' | 'error';
  error?: string;
}

export interface MultiEntityAnalysis {
  meta: {
    period_prev: string;
    period_curr: string;
    total_entities: number;
    analyzed_at: string;
  };
  entities: EntityResult[];
  consolidated: AnalysisResult | null;
  benchmarks: BenchmarkResult[];
}

export interface BenchmarkResult {
  metric: string;
  unit: string;
  values: {
    entity: string;
    value: number;
    vs_average: number;
    rank: number;
  }[];
  average: number;
  best: string;
  worst: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

// Management Summary
export interface ManagementSummary {
  text: string;
  generatedByAI: boolean;
  generatedAt: string;
}

// Labor/Healthcare KPIs
export interface LabKPIs {
  // Revenue metrics
  revenue_prev: number;
  revenue_curr: number;
  revenue_delta: number;
  revenue_delta_pct: number;
  // Cost metrics
  total_costs_prev: number;
  total_costs_curr: number;
  // Personnel
  personnel_costs_prev: number;
  personnel_costs_curr: number;
  personnel_ratio_prev: number;  // Personalkosten / Umsatz
  personnel_ratio_curr: number;
  // Reagents/Materials
  reagent_costs_prev: number;
  reagent_costs_curr: number;
  reagent_ratio_prev: number;    // Reagenzienkosten / Umsatz
  reagent_ratio_curr: number;
  // Optional: Cost per test (if test count provided)
  test_count_prev?: number;
  test_count_curr?: number;
  cost_per_test_prev?: number;
  cost_per_test_curr?: number;
}

// Saved Analysis for persistence
export interface SavedAnalysis {
  id: string;
  name: string;
  entity: string;
  period_prev: string;
  period_curr: string;
  created_at: string;
  result: AnalysisResult;
  kpis?: LabKPIs;
  workflow_status: 'draft' | 'review' | 'approved';
  approved_by?: string;
  approved_at?: string;
}

// Extended Anomaly Types
export interface Anomaly {
  id: string;
  type: 'outlier' | 'frequency' | 'new_account' | 'missing_account' | 'timing' | 'single_booking';
  severity: 'low' | 'medium' | 'high';
  account?: number;
  account_name?: string;
  description: string;
  affected_amount: number;
  affected_bookings: TopBooking[];
  suggested_action: string;
}

// ============================================
// PLAN vs. IST vs. VJ - Triple Comparison
// ============================================

export interface TripleAccountDeviation {
  account: number;
  account_name: string;
  // Three-way values
  amount_vj: number;      // Vorjahr (Previous Year)
  amount_plan: number;    // Plan/Budget
  amount_ist: number;     // Ist (Actual)
  // Deltas vs Plan
  delta_plan_abs: number;
  delta_plan_pct: number;
  // Deltas vs VJ
  delta_vj_abs: number;
  delta_vj_pct: number;
  // Plan vs VJ (shows if plan was ambitious)
  plan_vs_vj_abs: number;
  plan_vs_vj_pct: number;
  // Status indicators
  status: 'on_track' | 'over_plan' | 'under_plan' | 'critical';
  comment: string;
  // Evidence
  top_bookings_ist?: TopBooking[];
  bookings_count_ist?: number;
}

export interface TripleCostCenterDeviation {
  cost_center: string;
  amount_vj: number;
  amount_plan: number;
  amount_ist: number;
  delta_plan_abs: number;
  delta_plan_pct: number;
  delta_vj_abs: number;
  delta_vj_pct: number;
  status: 'on_track' | 'over_plan' | 'under_plan' | 'critical';
  top_accounts: {
    account: number;
    account_name: string;
    delta_plan_abs: number;
    delta_vj_abs: number;
  }[];
}

export interface TripleAnalysisResult {
  meta: {
    period_vj: string;
    period_plan: string;
    period_ist: string;
    total_vj: number;
    total_plan: number;
    total_ist: number;
    bookings_ist: number;
    wesentlichkeit_abs: number;
    wesentlichkeit_pct: number;
    entity?: string;
  };
  summary: {
    // Totals
    total_delta_plan: number;
    total_delta_vj: number;
    // Revenue
    erloese_vj: number;
    erloese_plan: number;
    erloese_ist: number;
    erloese_delta_plan: number;
    erloese_delta_vj: number;
    // Expenses
    aufwendungen_vj: number;
    aufwendungen_plan: number;
    aufwendungen_ist: number;
    aufwendungen_delta_plan: number;
    aufwendungen_delta_vj: number;
    // Plan achievement
    plan_achievement_pct: number; // Ist / Plan * 100
  };
  by_account: TripleAccountDeviation[];
  by_cost_center: TripleCostCenterDeviation[];
  // Traffic light summary
  traffic_light: {
    green: number;   // On track
    yellow: number;  // Slight deviation
    red: number;     // Critical
  };
}

export interface TripleAnalysisConfig {
  wesentlichkeit_abs: number;
  wesentlichkeit_pct: number;
  period_vj_name: string;
  period_plan_name: string;
  period_ist_name: string;
  // Thresholds for traffic lights
  threshold_yellow_pct: number; // e.g., 5%
  threshold_red_pct: number;    // e.g., 10%
}

// Plan data can be either from CSV or manual entry
export interface PlanData {
  account: number;
  account_name: string;
  amount: number;
  cost_center?: string;
}

// ============================================
// Enterprise Feature Types
// ============================================

export interface DataProfile {
  rowCount: number;
  uniqueAccounts: number;
  uniqueCostCenters: number;
  uniqueDocuments: number;
  dateRange: { min: string; max: string };
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

export interface UploadResponse {
  success: boolean;
  tableName: string;
  profile: DataProfile;
  rowCount: number;
  detection: {
    format: string;
    confidence: number;
  };
}

export interface SQLQueryRequest {
  sql: string;
  format?: 'json' | 'csv';
  explain?: boolean;
}

export interface SQLQueryResponse {
  success: boolean;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  requestId?: string;
}

export interface VarianceResult {
  account: number;
  account_name: string;
  amount_prev: number;
  amount_curr: number;
  variance: number;
  variance_pct: number;
  bookings_prev?: number;
  bookings_curr?: number;
}

export interface VarianceDriver {
  account: number;
  account_name: string;
  contribution: number;
  contribution_pct: number;
}

export interface TimeSeriesPoint {
  period: string;
  value: number;
}

// Agent Types
export interface AgentResponse {
  answer: string;
  confidence: number;
  sources: Source[];
  toolCalls: ToolCall[];
  mode?: 'local' | 'cloud';
  model?: string;
}

export interface Source {
  type: 'query' | 'booking' | 'account' | 'document' | 'calculation';
  reference: string;
  excerpt?: string;
  description?: string;
  value?: number;
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  executionTimeMs?: number;
  error?: string;
  name?: string;
}

export interface AnalysisPlan {
  query: string;
  intent: string;
  steps: PlanStep[];
  estimatedCalls: number;
}

export interface PlanStep {
  step: number;
  action: string;
  tool: string;
  rationale: string;
}

export interface AccountKnowledge {
  account: number;
  account_name: string;
  name?: string;
  category: 'revenue' | 'expense' | string;
  typical_behavior?: string;
  seasonality?: string;
  benchmarks?: {
    absoluteThreshold?: number;
    revenueRatio?: { min: number; max: number };
  };
  related_accounts?: number[];
  typical_range?: { min: number; max: number };
  notes?: string;
}
