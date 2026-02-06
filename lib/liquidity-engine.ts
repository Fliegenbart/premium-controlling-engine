/**
 * Liquiditätsprognose — 13-Wochen Cashflow Forecast Engine
 * Vollständige Business-Logik für Liquiditätsplanung mit
 * Musteranalyse, Cashflow-Projektion und KPI-Berechnung
 */

import { Booking } from './types';
import {
  RecurringPattern,
  LiquidityWeek,
  LiquidityAlert,
  LiquidityForecastResult,
  CategoryBreakdownItem,
  CashflowCategory,
  categorizeAccount,
  ACCOUNT_CATEGORIES,
} from './liquidity-types';

// ============================================
// 1. detectRecurringPayments
// ============================================

export function detectRecurringPayments(bookings: Booking[]): RecurringPattern[] {
  if (bookings.length === 0) return [];

  // Group by normalized description + vendor
  const grouped = new Map<string, Booking[]>();

  for (const booking of bookings) {
    // Normalisiere Beschreibung
    const normalized = normalizeDescription(booking.text);
    const key = `${normalized}|${booking.vendor || 'unknown'}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(booking);
  }

  const patterns: RecurringPattern[] = [];

  for (const [key, entries] of grouped.entries()) {
    if (entries.length < 2) continue; // Mindestens 2 Vorkommen

    const [description, vendor] = key.split('|');
    const amounts = entries.map((e) => Math.abs(e.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Berechne Häufigkeit pro Jahr
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentEntries = entries.filter(
      (e) => new Date(e.posting_date) >= thirtyDaysAgo
    );

    if (recentEntries.length === 0) continue;

    // Schätze Jahreshäufigkeit
    const occurrencesPerMonth = recentEntries.length / 1; // Last 30 days
    const occurrencesPerYear = occurrencesPerMonth * 12;

    let frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
    let confidence = 0;

    if (occurrencesPerYear >= 40) {
      frequency = 'weekly';
      confidence = Math.min(1, occurrencesPerYear / 52);
    } else if (occurrencesPerYear >= 20 && occurrencesPerYear < 40) {
      frequency = 'biweekly';
      confidence = Math.min(1, occurrencesPerYear / 26);
    } else if (occurrencesPerYear >= 10 && occurrencesPerYear < 14) {
      frequency = 'monthly';
      confidence = Math.min(1, occurrencesPerYear / 12);
    } else if (occurrencesPerYear >= 3 && occurrencesPerYear < 5) {
      frequency = 'quarterly';
      confidence = Math.min(1, occurrencesPerYear / 4);
    } else {
      continue; // Keine erkannte Häufigkeit
    }

    // Berechne typische Tagesimtag
    const daysOfMonth = entries.map((e) => {
      const date = new Date(e.posting_date);
      return date.getDate();
    });
    const typicalDayOfMonth =
      Math.round(daysOfMonth.reduce((a, b) => a + b, 0) / daysOfMonth.length) ||
      1;

    // Bestimme Kategorie und Typ
    const account = entries[0].account;
    const category = categorizeAccount(account);
    const isExpense = account >= 5000;
    const bookingType = isExpense ? 'outflow' : 'inflow';

    patterns.push({
      description,
      vendor: vendor !== 'unknown' ? vendor : null,
      avgAmount: Math.round(avgAmount * 100) / 100,
      frequency,
      typicalDayOfMonth,
      confidence: Math.round(confidence * 100) / 100,
      occurrences: entries.length,
      type: bookingType,
      category: category.name,
      accountRange: [Math.floor(account / 100) * 100, Math.floor(account / 100) * 100 + 99],
    });
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

// ============================================
// 2. analyzeCashflowPatterns
// ============================================

export function analyzeCashflowPatterns(bookings: Booking[]): {
  patterns: RecurringPattern[];
  weeklyAverages: { inflows: number; outflows: number };
} {
  const patterns = detectRecurringPayments(bookings);

  // Gruppiere nach Kategorie
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentBookings = bookings.filter(
    (b) => new Date(b.posting_date) >= thirtyDaysAgo
  );

  let totalInflows = 0;
  let totalOutflows = 0;

  for (const booking of recentBookings) {
    const account = booking.account;
    const isExpense = account >= 5000;

    if (isExpense) {
      // Bei Ausgabe-Konten: positive Beträge = Ausgaben
      if (booking.amount > 0) {
        totalOutflows += booking.amount;
      } else {
        totalInflows += Math.abs(booking.amount);
      }
    } else {
      // Bei Revenue-Konten: positive = Einnahmen
      if (booking.amount > 0) {
        totalInflows += booking.amount;
      } else {
        totalOutflows += Math.abs(booking.amount);
      }
    }
  }

  const weeksOfData = 4.3; // Durchschnittliche Wochen im Monat
  const weeklyInflows = Math.round((totalInflows / weeksOfData) * 100) / 100;
  const weeklyOutflows = Math.round((totalOutflows / weeksOfData) * 100) / 100;

  return {
    patterns,
    weeklyAverages: {
      inflows: weeklyInflows,
      outflows: weeklyOutflows,
    },
  };
}

// ============================================
// 3. projectWeeklyCashflow (MAIN FUNCTION)
// ============================================

export function projectWeeklyCashflow(config: {
  bookings: Booking[];
  startBalance: number;
  threshold?: number;
  weeks?: number;
}): LiquidityForecastResult {
  const threshold = config.threshold ?? 50000;
  const weeksToProject = config.weeks ?? 13;
  const bookings = config.bookings;

  const analysis = analyzeCashflowPatterns(bookings);
  const patterns = analysis.patterns;
  const { inflows: avgWeeklyInflow, outflows: avgWeeklyOutflow } =
    analysis.weeklyAverages;

  // Gruppiere historische Buchungen nach Woche für Varianzberechnung
  const weeklyHistories = groupBookingsByWeek(bookings);
  const stdDev = calculateHistoricalStdDev(weeklyHistories);

  const today = new Date();
  const weeks: LiquidityWeek[] = [];

  let openingBalance = config.startBalance;
  let minBalance = openingBalance;
  let minBalanceWeek = 0;
  let totalProjectedInflow = 0;
  let totalProjectedOutflow = 0;

  // Generiere 13 Wochen
  for (let weekIndex = 0; weekIndex < weeksToProject; weekIndex++) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() + weekIndex * 7);
    // Normalisiere auf Montag
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
    weekStart.setDate(weekStart.getDate() - daysToMonday);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const calendarWeek = getCalendarWeek(weekStart);
    const startDateStr = formatDate(weekStart);
    const endDateStr = formatDate(weekEnd);

    // Confidence: sinkt pro Woche (1.0 → 0.4)
    const confidence = Math.max(0.4, 1 - weekIndex * 0.045);

    // Projiziere Inflows und Outflows
    let weekInflows = avgWeeklyInflow;
    let weekOutflows = avgWeeklyOutflow;

    // Salary-Zahlungen: 25.-28. eines Monats für Personalkosten (5000-5999)
    const dayOfMonth = weekStart.getDate();
    const isEndOfMonth = dayOfMonth >= 25 && dayOfMonth <= 28;
    if (isEndOfMonth) {
      // Zusätzliche Gehaltsausgaben
      const salaryPatterns = patterns.filter(
        (p) =>
          p.type === 'outflow' &&
          p.category === 'Personalkosten' &&
          p.frequency === 'monthly'
      );
      for (const pattern of salaryPatterns) {
        weekOutflows += pattern.avgAmount * (pattern.confidence * 0.5);
      }
    }

    // Rent-Zahlungen: 1.-5. eines Monats für Raumkosten (4200-4299)
    const isStartOfMonth = dayOfMonth >= 1 && dayOfMonth <= 5;
    if (isStartOfMonth) {
      const rentPatterns = patterns.filter(
        (p) =>
          p.type === 'outflow' &&
          (p.category === 'Raumkosten' || p.category.includes('Raum'))
      );
      for (const pattern of rentPatterns) {
        weekOutflows += pattern.avgAmount * (pattern.confidence * 0.5);
      }
    }

    // Addiere Recurring Patterns
    for (const pattern of patterns) {
      if (shouldIncludePattern(pattern, weekIndex, weeksToProject)) {
        const amount = pattern.avgAmount * pattern.confidence;
        if (pattern.type === 'inflow') {
          weekInflows += amount;
        } else {
          weekOutflows += amount;
        }
      }
    }

    // Runde auf Cent
    weekInflows = Math.round(weekInflows * 100) / 100;
    weekOutflows = Math.round(weekOutflows * 100) / 100;

    const netCashflow = weekInflows - weekOutflows;
    const closingBalance = openingBalance + netCashflow;

    // Bounds basierend auf Standardabweichung
    const widthFactor = stdDev * (1 + weekIndex * 0.1);
    const lowerBound = Math.round((closingBalance - widthFactor) * 100) / 100;
    const upperBound = Math.round((closingBalance + widthFactor) * 100) / 100;

    // Kategorisiere Cashflows
    const categories = buildWeekCategories(
      bookings,
      weekStart,
      weekEnd,
      patterns
    );

    const week: LiquidityWeek = {
      weekNumber: weekIndex + 1,
      calendarWeek,
      startDate: startDateStr,
      endDate: endDateStr,
      openingBalance: Math.round(openingBalance * 100) / 100,
      inflows: weekInflows,
      outflows: weekOutflows,
      netCashflow: Math.round(netCashflow * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      isActual: false, // Alle sind Prognosen
      confidence: Math.round(confidence * 100) / 100,
      lowerBound,
      upperBound,
      categories,
    };

    weeks.push(week);

    // Tracking für KPIs
    if (closingBalance < minBalance) {
      minBalance = closingBalance;
      minBalanceWeek = calendarWeek;
    }

    totalProjectedInflow += weekInflows;
    totalProjectedOutflow += weekOutflows;

    openingBalance = closingBalance;
  }

  // Berechne KPIs
  const burnRate = Math.round(
    ((totalProjectedOutflow - totalProjectedInflow) / weeksToProject) * 100
  ) / 100;
  const runway =
    burnRate >= 0 ? (minBalance / burnRate > 0 ? minBalance / burnRate : Infinity) : Infinity;

  // Generiere Alerts
  const alerts = generateAlerts(weeks, threshold);

  // Generiere Insights
  const categoryBreakdown = buildCategoryBreakdown(weeks);
  const insights = generateInsights({
    weeks,
    patterns,
    kpis: {
      currentBalance: config.startBalance,
      minBalance,
      minBalanceWeek,
      burnRate,
      runway,
      avgWeeklyInflow,
      avgWeeklyOutflow,
      totalProjectedInflow,
      totalProjectedOutflow,
    },
    categoryBreakdown,
  });

  return {
    generatedAt: new Date().toISOString(),
    startBalance: config.startBalance,
    threshold,
    weeks,
    alerts,
    kpis: {
      currentBalance: config.startBalance,
      minBalance: Math.round(minBalance * 100) / 100,
      minBalanceWeek,
      burnRate,
      runway: isFinite(runway) ? Math.round(runway * 100) / 100 : Infinity,
      avgWeeklyInflow: Math.round(avgWeeklyInflow * 100) / 100,
      avgWeeklyOutflow: Math.round(avgWeeklyOutflow * 100) / 100,
      totalProjectedInflow: Math.round(totalProjectedInflow * 100) / 100,
      totalProjectedOutflow: Math.round(totalProjectedOutflow * 100) / 100,
    },
    insights,
    recurringPatterns: patterns,
    categoryBreakdown,
  };
}

// ============================================
// 4. generateAlerts
// ============================================

export function generateAlerts(weeks: LiquidityWeek[], threshold: number): LiquidityAlert[] {
  const alerts: LiquidityAlert[] = [];

  for (const week of weeks) {
    if (week.closingBalance < threshold && week.closingBalance > 0) {
      alerts.push({
        week: week.calendarWeek,
        type: 'warning',
        message: `KW ${week.calendarWeek}: Kontostand unter Schwelle - EUR ${week.closingBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} erwartet`,
        projectedBalance: week.closingBalance,
        icon: '⚠️',
      });
    } else if (week.closingBalance <= 0) {
      alerts.push({
        week: week.calendarWeek,
        type: 'critical',
        message: `KW ${week.calendarWeek}: Kritischer Mangel - EUR ${week.closingBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} erwartet`,
        projectedBalance: week.closingBalance,
        icon: '🚨',
      });
    }

    // Großer Abfall erkannt
    if (week.weekNumber > 1 && week.netCashflow < -10000) {
      alerts.push({
        week: week.calendarWeek,
        type: 'info',
        message: `KW ${week.calendarWeek}: Großer Cashflow-Abfall - EUR ${Math.abs(week.netCashflow).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} erwartet`,
        projectedBalance: week.closingBalance,
        icon: '📊',
      });
    }
  }

  return alerts;
}

// ============================================
// 5. generateInsights
// ============================================

export function generateInsights(result: {
  weeks: LiquidityWeek[];
  patterns: RecurringPattern[];
  kpis: {
    currentBalance: number;
    minBalance: number;
    minBalanceWeek: number;
    burnRate: number;
    runway: number;
    avgWeeklyInflow: number;
    avgWeeklyOutflow: number;
    totalProjectedInflow: number;
    totalProjectedOutflow: number;
  };
  categoryBreakdown: CategoryBreakdownItem[];
}): string[] {
  const insights: string[] = [];

  // Insight 1: Salary payments and impact
  const salaryPatterns = result.patterns.filter(
    (p) =>
      p.type === 'outflow' &&
      p.category === 'Personalkosten' &&
      p.frequency === 'monthly'
  );
  if (salaryPatterns.length > 0) {
    const salaryAmount = salaryPatterns[0].avgAmount;
    const impactWeek = Math.ceil(salaryPatterns[0].typicalDayOfMonth / 7);
    const impactWeekData = result.weeks[impactWeek - 1];
    if (impactWeekData) {
      const balance = impactWeekData.closingBalance;
      const impact = Math.round(salaryAmount * 100) / 100;
      insights.push(
        `Gehaltszahlung in KW ${impactWeekData.calendarWeek} führt voraussichtlich zu Kontostand von EUR ${balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      );
    }
  }

  // Insight 2: Liquidity buffer runway
  const runway = result.kpis.runway;
  if (isFinite(runway) && runway < 13) {
    const formattedRunway = Math.round(runway * 10) / 10;
    insights.push(
      `Ihr Liquiditätspuffer reicht bei aktuellem Burn-Rate für ${formattedRunway} Wochen`
    );
  } else if (isFinite(runway)) {
    insights.push(`Ihre Liquiditätsposition ist für den 13-Wochen-Horizont stabil`);
  }

  // Insight 3: Top expense driver
  const outflowCategories = result.categoryBreakdown.filter((c) => c.type === 'outflow');
  if (outflowCategories.length > 0) {
    const topCategory = outflowCategories.sort((a, b) => b.totalAmount - a.totalAmount)[0];
    const percentage = Math.round(topCategory.percentage);
    insights.push(
      `Hauptkostentreiber: ${topCategory.name} (${percentage}% der Ausgaben)`
    );
  }

  // Insight 4: Cash accumulation or depletion pattern
  const firstHalf = result.weeks.slice(0, 7);
  const secondHalf = result.weeks.slice(7);

  const firstHalfAvgBalance = firstHalf.length > 0
    ? firstHalf.reduce((sum, w) => sum + w.closingBalance, 0) / firstHalf.length
    : 0;
  const secondHalfAvgBalance = secondHalf.length > 0
    ? secondHalf.reduce((sum, w) => sum + w.closingBalance, 0) / secondHalf.length
    : 0;

  if (firstHalfAvgBalance > secondHalfAvgBalance) {
    const trend = Math.round((firstHalfAvgBalance - secondHalfAvgBalance) * 100) / 100;
    insights.push(
      `Trend: Konto wird in der zweiten Hälfte des Prognose-Zeitraums leerer - durchschnittlicher Rückgang EUR ${trend.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  } else if (secondHalfAvgBalance > firstHalfAvgBalance) {
    const trend = Math.round((secondHalfAvgBalance - firstHalfAvgBalance) * 100) / 100;
    insights.push(
      `Trend: Konto stabilisiert sich in der zweiten Hälfte - durchschnittliche Verbesserung EUR ${trend.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  }

  // Insight 5: Inflow vs Outflow balance
  const totalInflow = result.kpis.totalProjectedInflow;
  const totalOutflow = result.kpis.totalProjectedOutflow;
  const ratio = totalInflow > 0 ? (totalOutflow / totalInflow) * 100 : 100;
  insights.push(
    `Ausgaben-Verhältnis: Ihre Ausgaben betragen ${Math.round(ratio)}% der erwarteten Einnahmen`
  );

  return insights.slice(0, 5); // Limit to 5 insights
}

// ============================================
// 6. buildCategoryBreakdown
// ============================================

export function buildCategoryBreakdown(weeks: LiquidityWeek[]): CategoryBreakdownItem[] {
  const categoryMap = new Map<
    string,
    { totalAmount: number; type: 'inflow' | 'outflow'; count: number }
  >();

  for (const week of weeks) {
    for (const category of week.categories) {
      const key = category.name;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { totalAmount: 0, type: category.type, count: 0 });
      }
      const current = categoryMap.get(key)!;
      current.totalAmount += category.amount;
      current.count += 1;
    }
  }

  // Calculate totals for percentage calculation
  let totalInflow = 0;
  let totalOutflow = 0;

  for (const [, data] of categoryMap) {
    if (data.type === 'inflow') {
      totalInflow += data.totalAmount;
    } else {
      totalOutflow += data.totalAmount;
    }
  }

  const breakdown: CategoryBreakdownItem[] = [];

  for (const [name, data] of categoryMap) {
    const total = data.type === 'inflow' ? totalInflow : totalOutflow;
    const percentage = total > 0 ? (data.totalAmount / total) * 100 : 0;
    const weeklyAvg = data.count > 0 ? data.totalAmount / data.count : 0;

    // Determine color based on category
    const color = getCategoryColor(name);

    breakdown.push({
      name,
      totalAmount: Math.round(data.totalAmount * 100) / 100,
      type: data.type,
      weeklyAvg: Math.round(weeklyAvg * 100) / 100,
      color,
      percentage: Math.round(percentage * 100) / 100,
    });
  }

  return breakdown.sort((a, b) => b.totalAmount - a.totalAmount);
}

// ============================================
// Helper Functions
// ============================================

function normalizeDescription(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0-9]/g, 'X')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCalendarWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function groupBookingsByWeek(
  bookings: Booking[]
): Map<number, { inflows: number; outflows: number }> {
  const grouped = new Map<number, { inflows: number; outflows: number }>();

  for (const booking of bookings) {
    const date = new Date(booking.posting_date);
    const week = getCalendarWeek(date);

    if (!grouped.has(week)) {
      grouped.set(week, { inflows: 0, outflows: 0 });
    }

    const weekData = grouped.get(week)!;
    const account = booking.account;
    const isExpense = account >= 5000;

    if (isExpense) {
      if (booking.amount > 0) {
        weekData.outflows += booking.amount;
      } else {
        weekData.inflows += Math.abs(booking.amount);
      }
    } else {
      if (booking.amount > 0) {
        weekData.inflows += booking.amount;
      } else {
        weekData.outflows += Math.abs(booking.amount);
      }
    }
  }

  return grouped;
}

function calculateHistoricalStdDev(
  weeklyHistories: Map<number, { inflows: number; outflows: number }>
): number {
  if (weeklyHistories.size === 0) return 5000; // Default 5000 EUR

  const netCashflows: number[] = [];
  for (const { inflows, outflows } of weeklyHistories.values()) {
    netCashflows.push(inflows - outflows);
  }

  const mean = netCashflows.reduce((a, b) => a + b, 0) / netCashflows.length;
  const variance =
    netCashflows.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    netCashflows.length;
  const stdDev = Math.sqrt(variance);

  return isFinite(stdDev) ? stdDev : 5000;
}

function shouldIncludePattern(
  pattern: RecurringPattern,
  weekIndex: number,
  totalWeeks: number
): boolean {
  // Vereinfachte Logik: Wenn Pattern häufig genug ist, einschließen
  // mit Adjustments basierend auf Häufigkeit

  switch (pattern.frequency) {
    case 'weekly':
      return true;
    case 'biweekly':
      return weekIndex % 2 === 0;
    case 'monthly':
      // Etwa alle 4 Wochen
      return weekIndex % 4 === 0;
    case 'quarterly':
      // Etwa alle 13 Wochen
      return weekIndex % 13 === 0;
    default:
      return false;
  }
}

function buildWeekCategories(
  bookings: Booking[],
  weekStart: Date,
  weekEnd: Date,
  patterns: RecurringPattern[]
): CashflowCategory[] {
  const categories: CashflowCategory[] = [];
  const categoryMap = new Map<string, CashflowCategory>();

  // Filtere Buchungen für diese Woche
  const weekBookings = bookings.filter((b) => {
    const date = new Date(b.posting_date);
    return date >= weekStart && date <= weekEnd;
  });

  for (const booking of weekBookings) {
    const account = booking.account;
    const category = categorizeAccount(account);
    const isExpense = account >= 5000;
    const type = isExpense
      ? booking.amount > 0
        ? 'outflow'
        : 'inflow'
      : booking.amount > 0
        ? 'inflow'
        : 'outflow';

    const amount = Math.abs(booking.amount);
    const key = category.name;

    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        name: category.name,
        amount: 0,
        type,
        isRecurring: false,
        confidence: 0,
        accountRange: [account, account],
      });
    }

    const cat = categoryMap.get(key)!;
    cat.amount += amount;

    // Prüfe ob Recurring
    const isRecurring = patterns.some(
      (p) =>
        p.category === category.name &&
        normalizeDescription(p.description) === normalizeDescription(booking.text)
    );
    if (isRecurring) {
      cat.isRecurring = true;
      cat.confidence = Math.max(
        cat.confidence,
        patterns.find(
          (p) =>
            p.category === category.name &&
            normalizeDescription(p.description) === normalizeDescription(booking.text)
        )?.confidence || 0
      );
    }
  }

  // Addiere Projizierte Patterns für diese Woche
  for (const pattern of patterns) {
    const key = pattern.category;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        name: pattern.category,
        amount: 0,
        type: pattern.type,
        isRecurring: true,
        confidence: pattern.confidence,
        accountRange: pattern.accountRange,
      });
    }

    const cat = categoryMap.get(key)!;
    if (shouldIncludePattern(pattern, 0, 13)) {
      cat.amount += pattern.avgAmount;
      cat.confidence = Math.max(cat.confidence, pattern.confidence);
    }
  }

  for (const cat of categoryMap.values()) {
    cat.amount = Math.round(cat.amount * 100) / 100;
    categories.push(cat);
  }

  return categories;
}

function getCategoryColor(categoryName: string): string {
  for (const [name, config] of Object.entries(ACCOUNT_CATEGORIES)) {
    if (name === categoryName) {
      return config.color;
    }
  }

  // Default colors
  if (categoryName.toLowerCase().includes('erlös')) return '#10b981';
  if (categoryName.toLowerCase().includes('personal')) return '#ef4444';
  if (categoryName.toLowerCase().includes('material')) return '#f59e0b';
  if (categoryName.toLowerCase().includes('raum')) return '#8b5cf6';
  if (categoryName.toLowerCase().includes('energie')) return '#06b6d4';
  if (categoryName.toLowerCase().includes('versicherung')) return '#ec4899';

  return '#9ca3af';
}

