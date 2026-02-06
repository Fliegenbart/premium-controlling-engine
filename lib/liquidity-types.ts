/**
 * Liquiditätsplanung — 13-Wochen Cashflow Forecast
 * Types für die wöchentliche Liquiditätsprognose
 */

import { Booking } from './types';

// ============================================
// Cashflow Category Breakdown
// ============================================

export interface CashflowCategory {
  name: string;                 // "Personalkosten", "Erlöse", "Miete" etc.
  amount: number;
  type: 'inflow' | 'outflow';
  isRecurring: boolean;
  confidence: number;           // 0-1
  accountRange?: [number, number]; // z.B. [5000, 5999] für Personal
}

// ============================================
// Weekly Liquidity Data
// ============================================

export interface LiquidityWeek {
  weekNumber: number;           // KW 1-13
  calendarWeek: number;         // Tatsächliche Kalenderwoche (z.B. KW 6)
  startDate: string;            // "2024-02-05"
  endDate: string;              // "2024-02-11"
  openingBalance: number;
  inflows: number;              // Zahlungseingänge
  outflows: number;             // Zahlungsausgänge (positiv dargestellt)
  netCashflow: number;          // inflows - outflows
  closingBalance: number;
  isActual: boolean;            // Vergangenheit (true) oder Prognose (false)
  confidence: number;           // 0-1, sinkt mit Entfernung
  lowerBound: number;           // pessimistischer Closing Balance
  upperBound: number;           // optimistischer Closing Balance
  categories: CashflowCategory[];
}

// ============================================
// Alerts
// ============================================

export interface LiquidityAlert {
  week: number;                 // KW-Nummer
  type: 'critical' | 'warning' | 'info';
  message: string;              // z.B. "KW 8: Kontostand unter 50.000 EUR erwartet"
  projectedBalance: number;
  icon: string;                 // Emoji
}

// ============================================
// Recurring Payment Pattern
// ============================================

export interface RecurringPattern {
  description: string;          // Buchungstext-Pattern
  vendor: string | null;
  avgAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  typicalDayOfMonth: number;    // 1-31
  confidence: number;
  occurrences: number;          // Wie oft erkannt
  type: 'inflow' | 'outflow';
  category: string;             // Personalkosten, Miete, etc.
  accountRange: [number, number];
}

// ============================================
// Forecast Result
// ============================================

export interface LiquidityForecastResult {
  generatedAt: string;
  startBalance: number;
  threshold: number;            // Konfigurierter Schwellenwert
  weeks: LiquidityWeek[];
  alerts: LiquidityAlert[];
  kpis: {
    currentBalance: number;
    minBalance: number;          // Tiefster prognostizierter Stand
    minBalanceWeek: number;      // In welcher KW (calendarWeek)
    burnRate: number;            // Durchschn. wöchentlicher Netto-Abfluss
    runway: number;              // Wochen bis Kontostand <= 0 (Infinity wenn nie)
    avgWeeklyInflow: number;
    avgWeeklyOutflow: number;
    totalProjectedInflow: number;
    totalProjectedOutflow: number;
  };
  insights: string[];           // KI-generierte Empfehlungen (deutsch)
  recurringPatterns: RecurringPattern[];
  categoryBreakdown: CategoryBreakdownItem[];
}

export interface CategoryBreakdownItem {
  name: string;
  totalAmount: number;
  type: 'inflow' | 'outflow';
  weeklyAvg: number;
  color: string;                // Für Charts
  percentage: number;           // Anteil an Gesamt-Ein/Ausgängen
}

// ============================================
// API Request Config
// ============================================

export interface LiquidityForecastConfig {
  startBalance: number;         // Anfangs-Kontostand
  threshold: number;            // Warn-Schwelle (Default: 50000)
  weeks: number;                // Prognose-Horizont (Default: 13)
}

// ============================================
// Account Category Mapping
// ============================================

export const ACCOUNT_CATEGORIES: Record<string, { range: [number, number]; type: 'inflow' | 'outflow'; color: string }> = {
  'Erlöse': { range: [8000, 8999], type: 'inflow', color: '#10b981' },
  'Personalkosten': { range: [5000, 5999], type: 'outflow', color: '#ef4444' },
  'Materialkosten': { range: [3000, 3999], type: 'outflow', color: '#f59e0b' },
  'Raumkosten': { range: [4200, 4299], type: 'outflow', color: '#8b5cf6' },
  'Energie': { range: [4200, 4249], type: 'outflow', color: '#06b6d4' },
  'Versicherungen': { range: [4300, 4399], type: 'outflow', color: '#ec4899' },
  'Abschreibungen': { range: [4800, 4899], type: 'outflow', color: '#6b7280' },
  'Sonstige Aufwendungen': { range: [6000, 6999], type: 'outflow', color: '#a855f7' },
  'Steuern': { range: [7000, 7999], type: 'outflow', color: '#dc2626' },
};

export function categorizeAccount(account: number): { name: string; type: 'inflow' | 'outflow'; color: string } {
  for (const [name, config] of Object.entries(ACCOUNT_CATEGORIES)) {
    if (account >= config.range[0] && account <= config.range[1]) {
      return { name, type: config.type, color: config.color };
    }
  }
  // Default: Konten unter 5000 sind eher Erlöse, darüber Aufwand
  if (account < 5000) {
    return { name: 'Sonstige Erlöse', type: 'inflow', color: '#34d399' };
  }
  return { name: 'Sonstige Aufwendungen', type: 'outflow', color: '#9ca3af' };
}
