/**
 * Mehrstufige Deckungsbeitragsrechnung — Engine
 * Berechnet DB I → DB V aus Buchungsdaten
 */

import { Booking } from '@/lib/types';
import {
  classifyAccount,
  CostType,
  ContributionResult,
  ContributionConfig,
  ContributionRow,
  ContributionByDimension,
  ContributionTotals,
  ContributionPercentages,
  WaterfallItem,
  Dimension,
  DB_LEVELS,
} from '@/lib/contribution-types';

// ─── Main Entry Point ───

export function calculateContributionMargin(
  bookings: Booking[],
  config: ContributionConfig
): ContributionResult {
  if (bookings.length === 0) {
    return getEmptyResult(config);
  }

  // 1. Klassifiziere alle Buchungen
  const classified = groupByClassification(bookings);

  // 2. Berechne Summen pro Kostentyp
  const revenue = sumGroup(classified.get('revenue'));
  const variableCosts = sumGroup(classified.get('variable'));
  const db1 = revenue - variableCosts;

  const directPersonnel = sumGroup(classified.get('direct_personnel'));
  const db2 = db1 - directPersonnel;

  const directOther = sumGroup(classified.get('direct_other'));
  const db3 = db2 - directOther;

  const overhead = sumGroup(classified.get('overhead'));
  const db4 = db3 - overhead;

  const taxDepreciation = sumGroup(classified.get('tax_depreciation'));
  const db5 = db4 - taxDepreciation;

  // 3. Totals
  const totals: ContributionTotals = {
    revenue,
    variable_costs: variableCosts,
    db1,
    direct_personnel: directPersonnel,
    db2,
    direct_other_costs: directOther,
    db3,
    overhead,
    db4,
    tax_depreciation: taxDepreciation,
    db5,
  };

  // 4. Percentages
  const pct = (val: number) => revenue > 0 ? round((val / revenue) * 100) : 0;
  const percentages: ContributionPercentages = {
    db1_pct: pct(db1),
    db2_pct: pct(db2),
    db3_pct: pct(db3),
    db4_pct: pct(db4),
    db5_pct: pct(db5),
  };

  // 5. Waterfall rows
  const rows = buildRows(classified, totals, revenue);

  // 6. Waterfall chart data
  const waterfallData = buildWaterfallData(totals);

  // 7. Dimension analysis
  const byDimension = calculateByDimension(bookings, config.dimension);

  // 8. Insights
  const insights = generateInsights(totals, percentages, byDimension);

  // 9. Meta
  const dates = bookings.map(b => b.posting_date).filter(Boolean).sort();
  const meta = {
    period: config.period || (dates.length > 0 ? `${dates[0]} – ${dates[dates.length - 1]}` : 'Unbekannt'),
    dimension: config.dimension,
    bookingCount: bookings.length,
    uniqueCostCenters: new Set(bookings.map(b => b.cost_center).filter(Boolean)).size,
    uniqueProfitCenters: new Set(bookings.map(b => b.profit_center).filter(Boolean)).size,
    uniqueCustomers: new Set(bookings.map(b => b.customer).filter(Boolean)).size,
    dateRange: {
      min: dates[0] || '',
      max: dates[dates.length - 1] || '',
    },
  };

  return { rows, byDimension, totals, percentages, waterfallData, meta, insights };
}

// ─── Grouping & Summation ───

function groupByClassification(bookings: Booking[]): Map<CostType, Booking[]> {
  const groups = new Map<CostType, Booking[]>();

  for (const booking of bookings) {
    const { type } = classifyAccount(booking.account);
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(booking);
  }

  return groups;
}

function sumGroup(bookings: Booking[] | undefined): number {
  if (!bookings || bookings.length === 0) return 0;

  let sum = 0;
  for (const b of bookings) {
    // Erlöskonten: Haben-Buchungen sind positiv (Umsatz)
    // Aufwandskonten: Soll-Buchungen sind positiv (Kosten)
    // Wir nehmen den Absolutwert für Kosten
    sum += Math.abs(b.amount);
  }
  return round(sum);
}

// ─── Waterfall Chart Data ───

function buildWaterfallData(totals: ContributionTotals): WaterfallItem[] {
  const items: WaterfallItem[] = [];
  let running = 0;

  // Umsatzerlöse (startet bei 0)
  items.push({
    name: 'Umsatzerlöse',
    value: totals.revenue,
    base: 0,
    fill: DB_LEVELS.revenue.color,
    isSubtotal: true,
  });
  running = totals.revenue;

  // Materialkosten (Abzug)
  items.push({
    name: 'Materialkosten',
    value: -totals.variable_costs,
    base: running - totals.variable_costs,
    fill: '#ef4444',
    isSubtotal: false,
  });
  running -= totals.variable_costs;

  // DB I
  items.push({
    name: 'DB I',
    value: totals.db1,
    base: 0,
    fill: DB_LEVELS.db1.color,
    isSubtotal: true,
  });

  // Personalkosten
  items.push({
    name: 'Personalkosten',
    value: -totals.direct_personnel,
    base: running - totals.direct_personnel,
    fill: '#f97316',
    isSubtotal: false,
  });
  running -= totals.direct_personnel;

  // DB II
  items.push({
    name: 'DB II',
    value: totals.db2,
    base: 0,
    fill: DB_LEVELS.db2.color,
    isSubtotal: true,
  });

  // Sonstige direkte Kosten
  items.push({
    name: 'Direktkosten',
    value: -totals.direct_other_costs,
    base: running - totals.direct_other_costs,
    fill: '#f59e0b',
    isSubtotal: false,
  });
  running -= totals.direct_other_costs;

  // DB III
  items.push({
    name: 'DB III',
    value: totals.db3,
    base: 0,
    fill: DB_LEVELS.db3.color,
    isSubtotal: true,
  });

  // Gemeinkosten
  items.push({
    name: 'Gemeinkosten',
    value: -totals.overhead,
    base: running - totals.overhead,
    fill: '#a855f7',
    isSubtotal: false,
  });
  running -= totals.overhead;

  // DB IV
  items.push({
    name: 'DB IV',
    value: totals.db4,
    base: 0,
    fill: DB_LEVELS.db4.color,
    isSubtotal: true,
  });

  // Steuern & AfA
  items.push({
    name: 'Steuern & AfA',
    value: -totals.tax_depreciation,
    base: running - totals.tax_depreciation,
    fill: '#6b7280',
    isSubtotal: false,
  });

  // DB V
  items.push({
    name: 'DB V',
    value: totals.db5,
    base: 0,
    fill: DB_LEVELS.db5.color,
    isSubtotal: true,
  });

  return items;
}

// ─── Detail Rows ───

function buildRows(
  classified: Map<CostType, Booking[]>,
  totals: ContributionTotals,
  revenue: number
): ContributionRow[] {
  const rows: ContributionRow[] = [];
  const pct = (v: number) => revenue > 0 ? round((v / revenue) * 100) : 0;

  // Umsatzerlöse
  rows.push({
    label: 'Umsatzerlöse',
    amount: totals.revenue,
    percentage: 100,
    marginPercentage: 100,
    level: 'revenue',
    isSubtotal: true,
    isCategory: false,
    children: buildAccountChildren(classified.get('revenue'), revenue),
  });

  // Variable Kosten
  rows.push({
    label: 'Materialkosten / Variable Kosten',
    amount: -totals.variable_costs,
    percentage: pct(totals.variable_costs),
    marginPercentage: pct(totals.db1),
    level: 'cost_header',
    costType: 'variable',
    isSubtotal: false,
    isCategory: true,
    children: buildAccountChildren(classified.get('variable'), revenue),
  });

  // DB I
  rows.push({
    label: 'DB I — Rohertrag',
    amount: totals.db1,
    percentage: pct(totals.db1),
    marginPercentage: pct(totals.db1),
    level: 'db1',
    isSubtotal: true,
    isCategory: false,
  });

  // Direkte Personalkosten
  rows.push({
    label: 'Direkte Personalkosten',
    amount: -totals.direct_personnel,
    percentage: pct(totals.direct_personnel),
    marginPercentage: pct(totals.db2),
    level: 'cost_header',
    costType: 'direct_personnel',
    isSubtotal: false,
    isCategory: true,
    children: buildAccountChildren(classified.get('direct_personnel'), revenue),
  });

  // DB II
  rows.push({
    label: 'DB II — Nach Personalkosten',
    amount: totals.db2,
    percentage: pct(totals.db2),
    marginPercentage: pct(totals.db2),
    level: 'db2',
    isSubtotal: true,
    isCategory: false,
  });

  // Sonstige direkte Kosten
  rows.push({
    label: 'Sonstige direkte Kosten',
    amount: -totals.direct_other_costs,
    percentage: pct(totals.direct_other_costs),
    marginPercentage: pct(totals.db3),
    level: 'cost_header',
    costType: 'direct_other',
    isSubtotal: false,
    isCategory: true,
    children: buildAccountChildren(classified.get('direct_other'), revenue),
  });

  // DB III
  rows.push({
    label: 'DB III — Nach Direktkosten',
    amount: totals.db3,
    percentage: pct(totals.db3),
    marginPercentage: pct(totals.db3),
    level: 'db3',
    isSubtotal: true,
    isCategory: false,
  });

  // Gemeinkosten
  rows.push({
    label: 'Gemeinkosten-Umlage',
    amount: -totals.overhead,
    percentage: pct(totals.overhead),
    marginPercentage: pct(totals.db4),
    level: 'cost_header',
    costType: 'overhead',
    isSubtotal: false,
    isCategory: true,
    children: buildAccountChildren(classified.get('overhead'), revenue),
  });

  // DB IV
  rows.push({
    label: 'DB IV — Nach Gemeinkosten',
    amount: totals.db4,
    percentage: pct(totals.db4),
    marginPercentage: pct(totals.db4),
    level: 'db4',
    isSubtotal: true,
    isCategory: false,
  });

  // Steuern & AfA
  rows.push({
    label: 'Steuern & Abschreibungen',
    amount: -totals.tax_depreciation,
    percentage: pct(totals.tax_depreciation),
    marginPercentage: pct(totals.db5),
    level: 'cost_header',
    costType: 'tax_depreciation',
    isSubtotal: false,
    isCategory: true,
    children: buildAccountChildren(classified.get('tax_depreciation'), revenue),
  });

  // DB V
  rows.push({
    label: 'DB V — Unternehmensergebnis',
    amount: totals.db5,
    percentage: pct(totals.db5),
    marginPercentage: pct(totals.db5),
    level: 'db5',
    isSubtotal: true,
    isCategory: false,
  });

  return rows;
}

function buildAccountChildren(bookings: Booking[] | undefined, totalRevenue: number): ContributionRow[] {
  if (!bookings || bookings.length === 0) return [];

  const accountMap = new Map<number, { name: string; sum: number; count: number }>();

  for (const b of bookings) {
    const existing = accountMap.get(b.account);
    if (existing) {
      existing.sum += Math.abs(b.amount);
      existing.count += 1;
    } else {
      accountMap.set(b.account, {
        name: b.account_name || `Konto ${b.account}`,
        sum: Math.abs(b.amount),
        count: 1,
      });
    }
  }

  return Array.from(accountMap.entries())
    .sort((a, b) => b[1].sum - a[1].sum)
    .slice(0, 15) // Max 15 Konten
    .map(([account, data]) => ({
      label: `${account} ${data.name}`,
      amount: -data.sum,
      percentage: totalRevenue > 0 ? round((data.sum / totalRevenue) * 100) : 0,
      marginPercentage: 0,
      level: 'cost_item' as const,
      isSubtotal: false,
      isCategory: false,
    }));
}

// ─── Dimension Analysis ───

function calculateByDimension(
  bookings: Booking[],
  dimension: Dimension
): ContributionByDimension[] {
  if (dimension === 'total') {
    // Berechne einmal für Gesamt
    const classified = groupByClassification(bookings);
    const rev = sumGroup(classified.get('revenue'));
    const d1 = rev - sumGroup(classified.get('variable'));
    const d2 = d1 - sumGroup(classified.get('direct_personnel'));
    const d3 = d2 - sumGroup(classified.get('direct_other'));
    const d4 = d3 - sumGroup(classified.get('overhead'));
    const d5 = d4 - sumGroup(classified.get('tax_depreciation'));
    const pct = (v: number) => rev > 0 ? round((v / rev) * 100) : 0;

    return [{
      key: 'total',
      label: 'Gesamt',
      revenue: rev,
      db1: d1, db1_pct: pct(d1),
      db2: d2, db2_pct: pct(d2),
      db3: d3, db3_pct: pct(d3),
      db4: d4, db4_pct: pct(d4),
      db5: d5, db5_pct: pct(d5),
    }];
  }

  // Gruppiere nach Dimension
  const groups = new Map<string, Booking[]>();
  for (const b of bookings) {
    let key: string;
    if (dimension === 'cost_center') {
      key = b.cost_center || 'Unzugeordnet';
    } else if (dimension === 'profit_center') {
      key = b.profit_center || 'Unzugeordnet';
    } else {
      key = b.customer || 'Unzugeordnet';
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }

  const results: ContributionByDimension[] = [];

  for (const [key, dimBookings] of groups) {
    const classified = groupByClassification(dimBookings);
    const rev = sumGroup(classified.get('revenue'));
    const d1 = rev - sumGroup(classified.get('variable'));
    const d2 = d1 - sumGroup(classified.get('direct_personnel'));
    const d3 = d2 - sumGroup(classified.get('direct_other'));
    const d4 = d3 - sumGroup(classified.get('overhead'));
    const d5 = d4 - sumGroup(classified.get('tax_depreciation'));
    const pct = (v: number) => rev > 0 ? round((v / rev) * 100) : 0;

    results.push({
      key,
      label: key,
      revenue: rev,
      db1: d1, db1_pct: pct(d1),
      db2: d2, db2_pct: pct(d2),
      db3: d3, db3_pct: pct(d3),
      db4: d4, db4_pct: pct(d4),
      db5: d5, db5_pct: pct(d5),
    });
  }

  return results.sort((a, b) => b.revenue - a.revenue);
}

// ─── KI-Insights ───

function generateInsights(
  totals: ContributionTotals,
  percentages: ContributionPercentages,
  byDimension: ContributionByDimension[]
): string[] {
  const insights: string[] = [];
  const { revenue, db1, db5 } = totals;

  // 1. Rohertrag-Marge
  if (revenue > 0) {
    const db1Margin = percentages.db1_pct;
    if (db1Margin >= 60) {
      insights.push(`Starker Rohertrag: ${db1Margin.toFixed(1)}% DB I Marge — überdurchschnittlich für den Mittelstand.`);
    } else if (db1Margin >= 40) {
      insights.push(`Solider Rohertrag: ${db1Margin.toFixed(1)}% DB I Marge nach Materialkosten.`);
    } else {
      insights.push(`Niedriger Rohertrag: Nur ${db1Margin.toFixed(1)}% DB I Marge — hoher Materialkostenanteil.`);
    }
  }

  // 2. Personalintensität
  if (revenue > 0 && db1 > 0) {
    const personalRatio = round((totals.direct_personnel / revenue) * 100);
    if (personalRatio > 30) {
      insights.push(`Hohe Personalintensität: ${personalRatio.toFixed(1)}% des Umsatzes gehen an direkte Personalkosten.`);
    }
  }

  // 3. Netto-Ergebnis
  if (revenue > 0) {
    const netMargin = percentages.db5_pct;
    if (netMargin < 0) {
      insights.push(`Verlust: DB V bei ${netMargin.toFixed(1)}% — Kostensenkung oder Umsatzsteigerung nötig.`);
    } else if (netMargin < 3) {
      insights.push(`Knappe Profitabilität: ${netMargin.toFixed(1)}% Netto-Marge — wenig Puffer.`);
    } else if (netMargin >= 10) {
      insights.push(`Starke Profitabilität: ${netMargin.toFixed(1)}% Netto-Marge (DB V).`);
    }
  }

  // 4. Gemeinkostenanteil
  if (revenue > 0) {
    const overheadRatio = round((totals.overhead / revenue) * 100);
    if (overheadRatio > 20) {
      insights.push(`Hoher Gemeinkostenblock: ${overheadRatio.toFixed(1)}% des Umsatzes — Optimierungspotenzial prüfen.`);
    }
  }

  // 5. Dimension-Vergleich
  if (byDimension.length > 2) {
    const sorted = [...byDimension].sort((a, b) => b.db1_pct - a.db1_pct);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best.key !== worst.key && best.db1_pct - worst.db1_pct > 10) {
      insights.push(`Größte Spreizung: "${best.label}" (${best.db1_pct.toFixed(1)}% DB I) vs. "${worst.label}" (${worst.db1_pct.toFixed(1)}% DB I).`);
    }
  }

  // 6. Margin-Erosion
  if (revenue > 0) {
    const erosionDb1ToDb5 = percentages.db1_pct - percentages.db5_pct;
    if (erosionDb1ToDb5 > 40) {
      insights.push(`Starke Margin-Erosion: ${erosionDb1ToDb5.toFixed(0)} Prozentpunkte Verlust von DB I zu DB V.`);
    }
  }

  return insights.slice(0, 6);
}

// ─── Utils ───

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function getEmptyResult(config: ContributionConfig): ContributionResult {
  const emptyTotals: ContributionTotals = {
    revenue: 0, variable_costs: 0, db1: 0, direct_personnel: 0, db2: 0,
    direct_other_costs: 0, db3: 0, overhead: 0, db4: 0, tax_depreciation: 0, db5: 0,
  };
  return {
    rows: [],
    byDimension: [],
    totals: emptyTotals,
    percentages: { db1_pct: 0, db2_pct: 0, db3_pct: 0, db4_pct: 0, db5_pct: 0 },
    waterfallData: [],
    meta: {
      period: 'Keine Daten',
      dimension: config.dimension,
      bookingCount: 0,
      uniqueCostCenters: 0,
      uniqueProfitCenters: 0,
      uniqueCustomers: 0,
      dateRange: { min: '', max: '' },
    },
    insights: ['Keine Buchungsdaten vorhanden. Laden Sie Daten in der Einzelanalyse hoch.'],
  };
}
