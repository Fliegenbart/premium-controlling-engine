/**
 * Kapitalflussrechnung nach DRS 21 — Types & Constants
 * Cashflow aus: laufender Geschäftstätigkeit, Investition, Finanzierung
 */

// ─── Enums & Unions ───

export type CashflowCategory = 'operating' | 'investing' | 'financing';
export type CashflowDirection = 'inflow' | 'outflow';

// ─── DRS 21 Kategorien ───

export const CASHFLOW_CATEGORIES: Record<CashflowCategory, {
  label: string;
  shortLabel: string;
  color: string;
  description: string;
}> = {
  operating: {
    label: 'Cashflow aus laufender Geschäftstätigkeit',
    shortLabel: 'Operativ',
    color: '#10b981',
    description: 'Einnahmen & Ausgaben aus dem Kerngeschäft',
  },
  investing: {
    label: 'Cashflow aus Investitionstätigkeit',
    shortLabel: 'Investition',
    color: '#3b82f6',
    description: 'Kauf/Verkauf von Anlagevermögen & Beteiligungen',
  },
  financing: {
    label: 'Cashflow aus Finanzierungstätigkeit',
    shortLabel: 'Finanzierung',
    color: '#a855f7',
    description: 'Kredit-Aufnahme/-Tilgung, EK-Veränderungen, Dividenden',
  },
};

// ─── SKR03/04 Kontenzuordnung ───

export const CASHFLOW_CLASSIFICATION: {
  category: CashflowCategory;
  direction: CashflowDirection;
  label: string;
  accountRanges: [number, number][];
}[] = [
  // ═══ OPERATING ═══
  { category: 'operating', direction: 'inflow', label: 'Umsatzerlöse', accountRanges: [[8000, 8999]] },
  { category: 'operating', direction: 'inflow', label: 'Sonstige betriebl. Erträge', accountRanges: [[2400, 2799]] },
  { category: 'operating', direction: 'outflow', label: 'Materialaufwand', accountRanges: [[3000, 3999]] },
  { category: 'operating', direction: 'outflow', label: 'Personalaufwand', accountRanges: [[4000, 4199]] },
  { category: 'operating', direction: 'outflow', label: 'Sonst. betriebl. Aufwand', accountRanges: [[4200, 4999], [6000, 6999]] },
  { category: 'operating', direction: 'outflow', label: 'Ertragsteuern', accountRanges: [[7600, 7699]] },

  // ═══ INVESTING ═══
  { category: 'investing', direction: 'outflow', label: 'Investitionen Sachanlagen', accountRanges: [[200, 499]] },
  { category: 'investing', direction: 'outflow', label: 'Investitionen immat. VG', accountRanges: [[10, 199]] },
  { category: 'investing', direction: 'outflow', label: 'Investitionen Finanzanlagen', accountRanges: [[500, 699]] },
  { category: 'investing', direction: 'outflow', label: 'Abschreibungen', accountRanges: [[7000, 7099]] },

  // ═══ FINANCING ═══
  { category: 'financing', direction: 'inflow', label: 'Kreditaufnahme', accountRanges: [[3100, 3199]] },
  { category: 'financing', direction: 'outflow', label: 'Tilgung', accountRanges: [[700, 799]] },
  { category: 'financing', direction: 'outflow', label: 'Zinsaufwand', accountRanges: [[7300, 7399]] },
  { category: 'financing', direction: 'inflow', label: 'Zinserträge', accountRanges: [[7100, 7199]] },
  { category: 'financing', direction: 'inflow', label: 'EK-Zuführung', accountRanges: [[800, 899]] },
  { category: 'financing', direction: 'outflow', label: 'Entnahmen / Dividenden', accountRanges: [[900, 999]] },
];

// ─── Interfaces ───

export interface CashflowLineItem {
  label: string;
  amount: number;
  category: CashflowCategory;
  direction: CashflowDirection;
  bookingCount: number;
  isSubtotal: boolean;
}

export interface CashflowCategorySummary {
  category: CashflowCategory;
  label: string;
  inflows: number;
  outflows: number;
  net: number;
  items: CashflowLineItem[];
}

export interface CashflowMonthly {
  month: string;
  monthLabel: string;
  operating: number;
  investing: number;
  financing: number;
  netCashflow: number;
  cumulativeCashflow: number;
}

export interface CashflowWaterfallItem {
  name: string;
  value: number;
  base: number;
  fill: string;
  isSubtotal: boolean;
}

export interface CashflowResult {
  categories: CashflowCategorySummary[];
  operating: CashflowCategorySummary;
  investing: CashflowCategorySummary;
  financing: CashflowCategorySummary;
  netCashflow: number;
  freeCashflow: number;
  operatingCashflowMargin: number;
  monthly: CashflowMonthly[];
  waterfallData: CashflowWaterfallItem[];
  meta: {
    period: string;
    bookingCount: number;
    dateRange: { min: string; max: string };
    revenueTotal: number;
  };
  insights: string[];
}

// ─── Helpers ───

export function classifyCashflowAccount(account: number): {
  category: CashflowCategory;
  direction: CashflowDirection;
  label: string;
} {
  for (const cls of CASHFLOW_CLASSIFICATION) {
    for (const [min, max] of cls.accountRanges) {
      if (account >= min && account <= max) {
        return { category: cls.category, direction: cls.direction, label: cls.label };
      }
    }
  }

  // Fallback nach Kontenklasse
  if (account < 1000) return { category: 'investing', direction: 'outflow', label: 'Sonstige Investitionen' };
  if (account < 3000) return { category: 'operating', direction: 'inflow', label: 'Sonstige Einzahlungen' };
  if (account < 7000) return { category: 'operating', direction: 'outflow', label: 'Betriebsaufwand' };
  if (account >= 7000 && account < 7100) return { category: 'investing', direction: 'outflow', label: 'Abschreibungen' };
  if (account >= 7100 && account < 7300) return { category: 'financing', direction: 'inflow', label: 'Zinserträge' };
  if (account >= 7300 && account < 7600) return { category: 'financing', direction: 'outflow', label: 'Zinsaufwand' };
  if (account >= 8000 && account <= 8999) return { category: 'operating', direction: 'inflow', label: 'Umsatzerlöse' };
  return { category: 'operating', direction: 'outflow', label: 'Sonstiges' };
}
