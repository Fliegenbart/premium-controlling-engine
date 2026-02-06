/**
 * Kapitalflussrechnung nach DRS 21 — Engine
 * Berechnet operativen, investiven und Finanzierungs-Cashflow
 */

import { Booking } from '@/lib/types';
import {
  classifyCashflowAccount,
  CashflowCategory,
  CashflowDirection,
  CashflowResult,
  CashflowCategorySummary,
  CashflowLineItem,
  CashflowMonthly,
  CashflowWaterfallItem,
  CASHFLOW_CATEGORIES,
} from '@/lib/cashflow-types';

// ─── Main Entry Point ───

export function calculateCashflowStatement(
  bookings: Booking[],
  config?: { period?: string }
): CashflowResult {
  if (bookings.length === 0) return getEmptyResult();

  // 1. Klassifiziere alle Buchungen
  const classified = classifyBookings(bookings);

  // 2. Baue Kategorie-Zusammenfassungen
  const operating = buildCategorySummary('operating', classified);
  const investing = buildCategorySummary('investing', classified);
  const financing = buildCategorySummary('financing', classified);

  const categories = [operating, investing, financing];
  const netCashflow = round(operating.net + investing.net + financing.net);
  const freeCashflow = round(operating.net + investing.net);

  // 3. Umsatzerlöse für Operating CF Margin
  const revenueTotal = bookings
    .filter(b => b.account >= 8000 && b.account <= 8999)
    .reduce((s, b) => s + Math.abs(b.amount), 0);
  const operatingCashflowMargin = revenueTotal > 0 ? round((operating.net / revenueTotal) * 100) : 0;

  // 4. Monatsvergleich
  const monthly = buildMonthlyBreakdown(bookings);

  // 5. Wasserfall
  const waterfallData = buildWaterfall(operating.net, investing.net, financing.net);

  // 6. Datumsrange
  const dates = bookings.map(b => b.posting_date).filter(Boolean).sort();
  const meta = {
    period: config?.period || (dates.length > 0 ? `${dates[0]} – ${dates[dates.length - 1]}` : 'Unbekannt'),
    bookingCount: bookings.length,
    dateRange: { min: dates[0] || '', max: dates[dates.length - 1] || '' },
    revenueTotal: round(revenueTotal),
  };

  // 7. Insights
  const insights = generateInsights(operating, investing, financing, netCashflow, freeCashflow, operatingCashflowMargin, revenueTotal);

  return {
    categories,
    operating,
    investing,
    financing,
    netCashflow,
    freeCashflow,
    operatingCashflowMargin,
    monthly,
    waterfallData,
    meta,
    insights,
  };
}

// ─── Classification ───

interface ClassifiedBooking {
  booking: Booking;
  category: CashflowCategory;
  direction: CashflowDirection;
  label: string;
}

function classifyBookings(bookings: Booking[]): ClassifiedBooking[] {
  return bookings.map(b => {
    const cls = classifyCashflowAccount(b.account);
    return { booking: b, ...cls };
  });
}

// ─── Category Summary ───

function buildCategorySummary(
  category: CashflowCategory,
  classified: ClassifiedBooking[]
): CashflowCategorySummary {
  const relevant = classified.filter(c => c.category === category);

  // Gruppiere nach Label
  const labelMap = new Map<string, { direction: CashflowDirection; sum: number; count: number }>();
  for (const c of relevant) {
    const key = c.label;
    const existing = labelMap.get(key);
    if (existing) {
      existing.sum += Math.abs(c.booking.amount);
      existing.count += 1;
    } else {
      labelMap.set(key, { direction: c.direction, sum: Math.abs(c.booking.amount), count: 1 });
    }
  }

  let inflows = 0;
  let outflows = 0;
  const items: CashflowLineItem[] = [];

  for (const [label, data] of labelMap) {
    const amount = data.direction === 'inflow' ? data.sum : -data.sum;
    if (data.direction === 'inflow') inflows += data.sum;
    else outflows += data.sum;

    items.push({
      label,
      amount: round(amount),
      category,
      direction: data.direction,
      bookingCount: data.count,
      isSubtotal: false,
    });
  }

  // Sortiere nach |Betrag| absteigend
  items.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  return {
    category,
    label: CASHFLOW_CATEGORIES[category].label,
    inflows: round(inflows),
    outflows: round(outflows),
    net: round(inflows - outflows),
    items,
  };
}

// ─── Monthly Breakdown ───

function buildMonthlyBreakdown(bookings: Booking[]): CashflowMonthly[] {
  const monthMap = new Map<string, { operating: number; investing: number; financing: number }>();
  const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  for (const b of bookings) {
    if (!b.posting_date) continue;
    const month = b.posting_date.slice(0, 7); // "2024-01"
    const cls = classifyCashflowAccount(b.account);
    const amount = cls.direction === 'inflow' ? Math.abs(b.amount) : -Math.abs(b.amount);

    if (!monthMap.has(month)) {
      monthMap.set(month, { operating: 0, investing: 0, financing: 0 });
    }
    const entry = monthMap.get(month)!;
    entry[cls.category] += amount;
  }

  // Sortiere nach Monat
  const months = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  let cumulative = 0;
  return months.map(([month, data]) => {
    const net = round(data.operating + data.investing + data.financing);
    cumulative += net;
    const [year, m] = month.split('-');
    const monthLabel = `${MONTH_NAMES[parseInt(m, 10) - 1]} ${year?.slice(2)}`;

    return {
      month,
      monthLabel,
      operating: round(data.operating),
      investing: round(data.investing),
      financing: round(data.financing),
      netCashflow: net,
      cumulativeCashflow: round(cumulative),
    };
  });
}

// ─── Waterfall Chart ───

function buildWaterfall(
  operating: number,
  investing: number,
  financing: number
): CashflowWaterfallItem[] {
  const items: CashflowWaterfallItem[] = [];
  let running = 0;

  // Operativ
  items.push({
    name: 'Operativ',
    value: operating,
    base: operating >= 0 ? 0 : -operating,
    fill: operating >= 0 ? '#10b981' : '#ef4444',
    isSubtotal: false,
  });
  running += operating;

  // Sub 1
  items.push({
    name: 'Zwischensumme',
    value: running,
    base: 0,
    fill: running >= 0 ? '#06b6d4' : '#f97316',
    isSubtotal: true,
  });

  // Investition
  items.push({
    name: 'Investition',
    value: investing,
    base: investing >= 0 ? running : running + investing,
    fill: investing >= 0 ? '#3b82f6' : '#ef4444',
    isSubtotal: false,
  });
  running += investing;

  // Free CF
  items.push({
    name: 'Free CF',
    value: running,
    base: 0,
    fill: running >= 0 ? '#0ea5e9' : '#f97316',
    isSubtotal: true,
  });

  // Finanzierung
  items.push({
    name: 'Finanzierung',
    value: financing,
    base: financing >= 0 ? running : running + financing,
    fill: financing >= 0 ? '#a855f7' : '#ef4444',
    isSubtotal: false,
  });
  running += financing;

  // Netto
  items.push({
    name: 'Netto-CF',
    value: running,
    base: 0,
    fill: running >= 0 ? '#10b981' : '#ef4444',
    isSubtotal: true,
  });

  return items;
}

// ─── KI Insights ───

function generateInsights(
  operating: CashflowCategorySummary,
  investing: CashflowCategorySummary,
  financing: CashflowCategorySummary,
  netCashflow: number,
  freeCashflow: number,
  operatingMargin: number,
  revenue: number
): string[] {
  const insights: string[] = [];

  // 1. Operativer Cashflow
  if (operating.net > 0) {
    insights.push(`Positiver operativer Cashflow von ${formatK(operating.net)} — das Kerngeschäft generiert Liquidität.`);
  } else {
    insights.push(`Negativer operativer Cashflow von ${formatK(operating.net)} — das Kerngeschäft verbraucht Liquidität. Handlungsbedarf!`);
  }

  // 2. Operating CF Margin
  if (revenue > 0) {
    if (operatingMargin > 15) {
      insights.push(`Starke operative CF-Marge: ${operatingMargin.toFixed(1)}% des Umsatzes fließt als Cash.`);
    } else if (operatingMargin > 5) {
      insights.push(`Solide operative CF-Marge von ${operatingMargin.toFixed(1)}%.`);
    } else if (operatingMargin > 0) {
      insights.push(`Knappe operative CF-Marge: Nur ${operatingMargin.toFixed(1)}% des Umsatzes als Cash — Optimierungspotenzial.`);
    }
  }

  // 3. Investitionstätigkeit
  if (investing.net < 0) {
    const investQuote = revenue > 0 ? round((Math.abs(investing.net) / revenue) * 100) : 0;
    insights.push(`Investitionsausgaben von ${formatK(Math.abs(investing.net))} (${investQuote.toFixed(1)}% vom Umsatz).`);
  } else if (investing.net > 0) {
    insights.push(`Positiver Investitions-CF: ${formatK(investing.net)} — Anlagenverkäufe oder Desinvestitionen.`);
  }

  // 4. Free Cashflow
  if (freeCashflow > 0) {
    insights.push(`Free Cashflow positiv: ${formatK(freeCashflow)} — Spielraum für Tilgung, Dividenden oder Wachstum.`);
  } else {
    insights.push(`Negativer Free Cashflow: ${formatK(freeCashflow)} — externe Finanzierung nötig.`);
  }

  // 5. Finanzierung
  if (financing.net > 0) {
    insights.push(`Finanzierungszufluss von ${formatK(financing.net)} — Kreditaufnahme oder EK-Zuführung.`);
  } else if (financing.net < 0) {
    insights.push(`Tilgung/Entnahmen von ${formatK(Math.abs(financing.net))} — Schuldenabbau oder Ausschüttung.`);
  }

  // 6. Netto-Cashflow
  if (netCashflow >= 0) {
    insights.push(`Positiver Netto-Cashflow: Die Liquiditätsreserven steigen um ${formatK(netCashflow)}.`);
  } else {
    insights.push(`Negativer Netto-Cashflow: Liquiditätsabfluss von ${formatK(Math.abs(netCashflow))} — Reserven prüfen!`);
  }

  return insights.slice(0, 6);
}

// ─── Utils ───

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mio. €`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} T€`;
  return `${n.toFixed(0)} €`;
}

function getEmptyResult(): CashflowResult {
  const emptyCat: CashflowCategorySummary = {
    category: 'operating', label: '', inflows: 0, outflows: 0, net: 0, items: [],
  };
  return {
    categories: [],
    operating: { ...emptyCat, category: 'operating', label: 'Operativ' },
    investing: { ...emptyCat, category: 'investing', label: 'Investition' },
    financing: { ...emptyCat, category: 'financing', label: 'Finanzierung' },
    netCashflow: 0,
    freeCashflow: 0,
    operatingCashflowMargin: 0,
    monthly: [],
    waterfallData: [],
    meta: { period: 'Keine Daten', bookingCount: 0, dateRange: { min: '', max: '' }, revenueTotal: 0 },
    insights: ['Keine Buchungsdaten vorhanden. Laden Sie Daten in der Einzelanalyse hoch.'],
  };
}
