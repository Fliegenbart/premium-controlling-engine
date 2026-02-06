/**
 * Mehrstufige Deckungsbeitragsrechnung — Types & Constants
 * DB I → DB V nach SKR03/04 Kontenrahmen
 */

// ─── Enums & Unions ───

export type ContributionLevel = 'revenue' | 'db1' | 'db2' | 'db3' | 'db4' | 'db5';
export type CostType = 'revenue' | 'variable' | 'direct_personnel' | 'direct_other' | 'overhead' | 'tax_depreciation' | 'unknown';
export type Dimension = 'total' | 'cost_center' | 'profit_center' | 'customer';

// ─── DB Level Metadata ───

export const DB_LEVELS: Record<ContributionLevel, {
  label: string;
  shortLabel: string;
  color: string;
  description: string;
}> = {
  revenue: {
    label: 'Umsatzerlöse',
    shortLabel: 'Umsatz',
    color: '#10b981',
    description: 'Gesamtumsatz aus Lieferungen & Leistungen',
  },
  db1: {
    label: 'DB I — Rohertrag',
    shortLabel: 'DB I',
    color: '#0ea5e9',
    description: 'Nach Abzug variable Kosten (Material)',
  },
  db2: {
    label: 'DB II — Nach Personalkosten',
    shortLabel: 'DB II',
    color: '#3b82f6',
    description: 'Nach Abzug direkte Personalkosten',
  },
  db3: {
    label: 'DB III — Nach Direktkosten',
    shortLabel: 'DB III',
    color: '#8b5cf6',
    description: 'Nach Abzug sonstige direkte Kosten',
  },
  db4: {
    label: 'DB IV — Nach Gemeinkosten',
    shortLabel: 'DB IV',
    color: '#a855f7',
    description: 'Nach Abzug Gemeinkosten-Umlage',
  },
  db5: {
    label: 'DB V — Unternehmensergebnis',
    shortLabel: 'DB V',
    color: '#ec4899',
    description: 'Netto-Ergebnis nach Steuern & AfA',
  },
};

// ─── Account Classification (SKR03/04) ───

export const COST_CLASSIFICATION: {
  type: CostType;
  label: string;
  accountRanges: [number, number][];
}[] = [
  {
    type: 'revenue',
    label: 'Umsatzerlöse',
    accountRanges: [[8000, 8999]],
  },
  {
    type: 'variable',
    label: 'Materialkosten / Variable Kosten',
    accountRanges: [[3000, 3999]],
  },
  {
    type: 'direct_personnel',
    label: 'Direkte Personalkosten',
    accountRanges: [[5000, 5299]],
  },
  {
    type: 'direct_other',
    label: 'Sonstige direkte Kosten',
    accountRanges: [[4200, 4799], [5300, 5999]],
  },
  {
    type: 'overhead',
    label: 'Gemeinkosten',
    accountRanges: [[6000, 6999]],
  },
  {
    type: 'tax_depreciation',
    label: 'Steuern & Abschreibungen',
    accountRanges: [[7000, 7999], [4800, 4899]],
  },
];

// ─── Interfaces ───

export interface ContributionRow {
  label: string;
  amount: number;
  percentage: number;         // % vom Umsatz
  marginPercentage: number;   // kumulative Marge
  level: ContributionLevel | 'cost_header' | 'cost_item';
  costType?: CostType;
  isSubtotal: boolean;
  isCategory: boolean;
  children?: ContributionRow[];
}

export interface ContributionByDimension {
  key: string;
  label: string;
  revenue: number;
  db1: number;
  db1_pct: number;
  db2: number;
  db2_pct: number;
  db3: number;
  db3_pct: number;
  db4: number;
  db4_pct: number;
  db5: number;
  db5_pct: number;
}

export interface ContributionTotals {
  revenue: number;
  variable_costs: number;
  db1: number;
  direct_personnel: number;
  db2: number;
  direct_other_costs: number;
  db3: number;
  overhead: number;
  db4: number;
  tax_depreciation: number;
  db5: number;
}

export interface ContributionPercentages {
  db1_pct: number;
  db2_pct: number;
  db3_pct: number;
  db4_pct: number;
  db5_pct: number;
}

export interface ContributionResult {
  rows: ContributionRow[];
  byDimension: ContributionByDimension[];
  totals: ContributionTotals;
  percentages: ContributionPercentages;
  waterfallData: WaterfallItem[];
  meta: {
    period: string;
    dimension: Dimension;
    bookingCount: number;
    uniqueCostCenters: number;
    uniqueProfitCenters: number;
    uniqueCustomers: number;
    dateRange: { min: string; max: string };
  };
  insights: string[];
}

export interface ContributionConfig {
  dimension: Dimension;
  period?: string;
}

export interface WaterfallItem {
  name: string;
  value: number;
  base: number;       // invisible base for stacking
  fill: string;
  isSubtotal: boolean;
}

// ─── Helper ───

export function classifyAccount(account: number): { type: CostType; label: string } {
  for (const cls of COST_CLASSIFICATION) {
    for (const [min, max] of cls.accountRanges) {
      if (account >= min && account <= max) {
        return { type: cls.type, label: cls.label };
      }
    }
  }
  // Fallback: < 5000 = Erlöse, >= 5000 = Aufwand
  if (account < 5000) {
    return { type: 'revenue', label: 'Sonstige Erlöse' };
  }
  return { type: 'overhead', label: 'Sonstige Aufwendungen' };
}

export const DIMENSION_LABELS: Record<Dimension, string> = {
  total: 'Gesamt',
  cost_center: 'Kostenstelle',
  profit_center: 'Profitcenter',
  customer: 'Kunde',
};
