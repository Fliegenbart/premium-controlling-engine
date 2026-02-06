export type CostType =
  | 'direct_material'
  | 'direct_labor'
  | 'manufacturing_overhead'
  | 'admin_overhead'
  | 'sales_overhead';

export interface CostCenter {
  id: string;
  name: string;
  type: 'main' | 'auxiliary';
  directCosts: number;
  allocatedCosts: number;
  totalCosts: number;
  overheadRate?: number;
}

export interface CostAccountDetail {
  account: number;
  name: string;
  amount: number;
  costCenter?: string;
}

export interface CostCategory {
  type: CostType;
  label: string;
  totalAmount: number;
  directAmount: number;
  overheadAmount: number;
  accounts: CostAccountDetail[];
}

export interface OverheadRates {
  materialOverheadRate: number;
  productionOverheadRate: number;
  adminOverheadRate: number;
  salesOverheadRate: number;
}

export interface AllocationEntry {
  costCenter: string;
  costType: CostType;
  amount: number;
}

export interface BABSummary {
  totalDirectCosts: number;
  totalOverheadCosts: number;
  totalCosts: number;
  overheadRatio: number;
  costPerCostCenter: Record<string, number>;
}

export interface BABResult {
  costCenters: CostCenter[];
  costCategories: CostCategory[];
  overheadRates: OverheadRates;
  allocationMatrix: AllocationEntry[];
  summary: BABSummary;
  insights: string[];
}

export const COST_TYPE_LABELS: Record<CostType, string> = {
  direct_material: 'Materialeinzelkosten',
  direct_labor: 'Fertigungslöhne',
  manufacturing_overhead: 'Fertigungsgemeinkosten',
  admin_overhead: 'Verwaltungsgemeinkosten',
  sales_overhead: 'Vertriebsgemeinkosten',
};

export const COST_TYPE_COLORS: Record<CostType, string> = {
  direct_material: '#10b981',
  direct_labor: '#3b82f6',
  manufacturing_overhead: '#f59e0b',
  admin_overhead: '#8b5cf6',
  sales_overhead: '#ef4444',
};
