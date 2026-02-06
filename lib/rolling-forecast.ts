/**
 * Rolling Forecast Engine
 * Smart rolling forecast combining actuals with statistical projections
 * Supports seasonality detection, trend analysis, and confidence intervals
 */

import { Booking } from './types';

export interface RollingForecastConfig {
  forecastHorizon: number; // months to forecast (default 12)
  seasonalityDetection: boolean;
  confidenceLevel: number; // 0.9 or 0.95
  method: 'auto' | 'seasonal' | 'trend' | 'hybrid';
}

export interface MonthlyDataPoint {
  period: string; // "2024-01", "2024-02", etc.
  actual?: number; // Actual value (if available)
  forecast?: number; // Forecasted value
  lowerBound?: number;
  upperBound?: number;
  isActual: boolean;
  seasonalIndex?: number;
}

export interface AccountForecast {
  account: number;
  account_name: string;
  category: 'revenue' | 'expense';
  monthlyData: MonthlyDataPoint[];
  annualProjection: number;
  annualActual: number; // Sum of actuals so far
  remainingForecast: number; // Sum of remaining forecasted months
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: number[]; // 12 seasonal indices
  confidence: number;
}

export interface RollingForecastResult {
  config: RollingForecastConfig;
  generatedAt: string;

  // Overall projections
  annualProjection: {
    totalRevenue: number;
    totalExpenses: number;
    projectedResult: number;
    actualYTD: number;
    forecastRemaining: number;
    achievementPct: number; // How much of the year is "done"
  };

  // Monthly timeline
  monthlyTimeline: {
    period: string;
    revenue: number;
    expenses: number;
    result: number;
    isActual: boolean;
    cumulativeRevenue: number;
    cumulativeExpenses: number;
    cumulativeResult: number;
  }[];

  // Per-account forecasts
  accountForecasts: AccountForecast[];

  // Insights
  insights: ForecastInsight[];

  // Year-end projection range
  yearEndRange: {
    optimistic: number;
    expected: number;
    pessimistic: number;
  };
}

export interface ForecastInsight {
  type: 'trend' | 'seasonality' | 'risk' | 'opportunity';
  severity: 'info' | 'warning' | 'positive';
  title: string;
  description: string;
  account?: number;
  impact?: number;
}

/**
 * Determine current year and month
 */
function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // 1-12
  };
}

/**
 * Format date as YYYY-MM
 */
function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Parse YYYY-MM format to year and month
 */
function parsePeriod(period: string): { year: number; month: number } {
  const [year, month] = period.split('-').map(Number);
  return { year, month };
}

/**
 * Group bookings by month and calculate sums
 */
function groupBookingsByMonth(
  bookings: Booking[]
): Record<string, { revenue: number; expense: number }> {
  const grouped: Record<string, { revenue: number; expense: number }> = {};

  bookings.forEach((booking) => {
    const period = booking.posting_date.substring(0, 7); // YYYY-MM

    if (!grouped[period]) {
      grouped[period] = { revenue: 0, expense: 0 };
    }

    // Assume accounts 1xxx-4xxx are revenue, 5xxx+ are expenses (common German chart of accounts)
    const accountNumber = booking.account;
    if (accountNumber < 5000) {
      grouped[period].revenue += Math.abs(booking.amount);
    } else {
      grouped[period].expense += Math.abs(booking.amount);
    }
  });

  return grouped;
}

/**
 * Group bookings by account
 */
function groupBookingsByAccount(
  bookings: Booking[]
): Record<
  number,
  { account_name: string; values: Record<string, number>; isRevenue: boolean }
> {
  const grouped: Record<
    number,
    { account_name: string; values: Record<string, number>; isRevenue: boolean }
  > = {};

  bookings.forEach((booking) => {
    const period = booking.posting_date.substring(0, 7);
    const account = booking.account;

    if (!grouped[account]) {
      const isRevenue = account < 5000;
      grouped[account] = {
        account_name: booking.account_name,
        values: {},
        isRevenue,
      };
    }

    if (!grouped[account].values[period]) {
      grouped[account].values[period] = 0;
    }

    grouped[account].values[period] += Math.abs(booking.amount);
  });

  return grouped;
}

/**
 * Calculate linear regression trend
 */
function calculateTrend(
  values: number[]
): { slope: number; intercept: number; rSquared: number } {
  if (values.length < 2) {
    return { slope: 0, intercept: values[0] || 0, rSquared: 0 };
  }

  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;

  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
    denominator += (x[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += (y[i] - predicted) ** 2;
    ssTot += (y[i] - yMean) ** 2;
  }

  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

  return { slope, intercept, rSquared };
}

/**
 * Calculate seasonal indices (1.0 = average, 1.2 = 20% above average, etc.)
 */
function calculateSeasonalIndices(
  monthlyValues: Record<string, number>
): number[] {
  const indices: number[] = new Array(12).fill(1.0);

  if (Object.keys(monthlyValues).length === 0) {
    return indices;
  }

  // Group values by month of year
  const monthGroups: Record<number, number[]> = {};
  for (let i = 0; i < 12; i++) {
    monthGroups[i] = [];
  }

  Object.entries(monthlyValues).forEach(([period, value]) => {
    const { month } = parsePeriod(period);
    monthGroups[month - 1].push(value);
  });

  // Calculate average for each month
  const monthAverages: number[] = [];
  const allValues: number[] = [];

  for (let i = 0; i < 12; i++) {
    if (monthGroups[i].length > 0) {
      const avg = monthGroups[i].reduce((a, b) => a + b, 0) / monthGroups[i].length;
      monthAverages[i] = avg;
      allValues.push(...monthGroups[i]);
    }
  }

  const overallAverage = allValues.reduce((a, b) => a + b, 0) / allValues.length;

  // Calculate indices
  for (let i = 0; i < 12; i++) {
    if (monthAverages[i] !== undefined && overallAverage > 0) {
      indices[i] = monthAverages[i] / overallAverage;
    }
  }

  return indices;
}

/**
 * Calculate confidence interval margin based on historical variance
 */
function calculateConfidenceMargin(
  values: number[],
  confidenceLevel: number,
  forecastMonthIndex: number
): number {
  if (values.length < 2) {
    return 0;
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Z-score for confidence level
  const zScore = confidenceLevel >= 0.95 ? 1.96 : 1.645;

  // Margin widens as we forecast further out
  const distanceFactor = 1 + forecastMonthIndex * 0.1;

  return zScore * stdDev * distanceFactor;
}

/**
 * Forecast values for remaining months of the year
 */
function forecastRemainingMonths(
  historicalValues: Record<string, number>,
  currentYear: number,
  currentMonth: number,
  forecastHorizon: number,
  method: 'seasonal' | 'trend' | 'hybrid',
  seasonalIndices: number[],
  confidenceLevel: number
): {
  monthlyData: MonthlyDataPoint[];
  totalForecast: number;
  confidence: number;
} {
  const monthlyData: MonthlyDataPoint[] = [];
  const values = Object.values(historicalValues);
  const trendData = calculateTrend(values);
  const { slope, intercept } = trendData;

  let totalForecast = 0;
  let monthCounter = currentMonth;
  let yearCounter = currentYear;

  for (let i = 1; i <= forecastHorizon; i++) {
    if (monthCounter > 12) {
      monthCounter = 1;
      yearCounter += 1;
    }

    const period = formatPeriod(yearCounter, monthCounter);
    const seasonalIndex = seasonalIndices[monthCounter - 1];
    const historicalCount = values.length;

    let forecastValue = 0;

    if (method === 'seasonal' && seasonalIndex) {
      // Pure seasonal: use average * seasonal index
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      forecastValue = avg * seasonalIndex;
    } else if (method === 'trend') {
      // Pure trend: linear regression
      forecastValue = slope * (historicalCount + i - 1) + intercept;
    } else {
      // Hybrid: combine trend and seasonality
      const trendValue = slope * (historicalCount + i - 1) + intercept;
      forecastValue = Math.max(0, trendValue * seasonalIndex);
    }

    const margin = calculateConfidenceMargin(values, confidenceLevel, i);

    monthlyData.push({
      period,
      forecast: Math.round(forecastValue * 100) / 100,
      lowerBound: Math.round(Math.max(0, forecastValue - margin) * 100) / 100,
      upperBound: Math.round((forecastValue + margin) * 100) / 100,
      isActual: false,
      seasonalIndex: Math.round(seasonalIndex * 100) / 100,
    });

    totalForecast += forecastValue;
    monthCounter++;
  }

  return {
    monthlyData,
    totalForecast: Math.round(totalForecast * 100) / 100,
    confidence: confidenceLevel,
  };
}

/**
 * Main function: Generate rolling forecast
 */
export function generateRollingForecast(
  currentBookings: Booking[],
  historicalBookings: Booking[] = [],
  config?: Partial<RollingForecastConfig>
): RollingForecastResult {
  const finalConfig: RollingForecastConfig = {
    forecastHorizon: config?.forecastHorizon || 12,
    seasonalityDetection: config?.seasonalityDetection !== false,
    confidenceLevel: config?.confidenceLevel || 0.95,
    method: config?.method || 'hybrid',
  };

  const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

  // Group current year bookings by month
  const monthlyGrouped = groupBookingsByMonth(currentBookings);

  // Get actual values for current year
  const actualMonthlyRevenue: Record<string, number> = {};
  const actualMonthlyExpense: Record<string, number> = {};

  Object.entries(monthlyGrouped).forEach(([period, { revenue, expense }]) => {
    actualMonthlyRevenue[period] = revenue;
    actualMonthlyExpense[period] = expense;
  });

  // Combine current and historical for seasonality detection
  const allBookings = [...currentBookings, ...historicalBookings];
  const combinedMonthlyGrouped = groupBookingsByMonth(allBookings);

  // Calculate seasonal indices from historical data
  const allMonthlyRevenue: Record<string, number> = {};
  const allMonthlyExpense: Record<string, number> = {};

  Object.entries(combinedMonthlyGrouped).forEach(
    ([period, { revenue, expense }]) => {
      allMonthlyRevenue[period] = revenue;
      allMonthlyExpense[period] = expense;
    }
  );

  const revenueSeasonality = finalConfig.seasonalityDetection
    ? calculateSeasonalIndices(allMonthlyRevenue)
    : new Array(12).fill(1.0);

  const expenseSeasonality = finalConfig.seasonalityDetection
    ? calculateSeasonalIndices(allMonthlyExpense)
    : new Array(12).fill(1.0);

  // Forecast remaining months
  const historicalRevenueValues = Object.values(actualMonthlyRevenue);
  const historicalExpenseValues = Object.values(actualMonthlyExpense);

  const revenueForecast = forecastRemainingMonths(
    actualMonthlyRevenue,
    currentYear,
    currentMonth + 1,
    finalConfig.forecastHorizon,
    finalConfig.method as 'seasonal' | 'trend' | 'hybrid',
    revenueSeasonality,
    finalConfig.confidenceLevel
  );

  const expenseForecast = forecastRemainingMonths(
    actualMonthlyExpense,
    currentYear,
    currentMonth + 1,
    finalConfig.forecastHorizon,
    finalConfig.method as 'seasonal' | 'trend' | 'hybrid',
    expenseSeasonality,
    finalConfig.confidenceLevel
  );

  // Build monthly timeline combining actuals and forecast
  const monthlyTimeline: RollingForecastResult['monthlyTimeline'] = [];

  for (let m = 1; m <= 12; m++) {
    const period = formatPeriod(currentYear, m);
    const isActual = m < currentMonth;

    let revenue = 0;
    let expenses = 0;

    if (isActual) {
      revenue = actualMonthlyRevenue[period] || 0;
      expenses = actualMonthlyExpense[period] || 0;
    } else {
      const revenueData = revenueForecast.monthlyData.find(
        (d) => d.period === period
      );
      const expenseData = expenseForecast.monthlyData.find(
        (d) => d.period === period
      );
      revenue = revenueData?.forecast || 0;
      expenses = expenseData?.forecast || 0;
    }

    monthlyTimeline.push({
      period,
      revenue: Math.round(revenue * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      result: Math.round((revenue - expenses) * 100) / 100,
      isActual,
      cumulativeRevenue: 0, // Will be calculated below
      cumulativeExpenses: 0, // Will be calculated below
      cumulativeResult: 0, // Will be calculated below
    });
  }

  // Calculate cumulative values
  let cumRevenue = 0;
  let cumExpenses = 0;
  monthlyTimeline.forEach((month) => {
    cumRevenue += month.revenue;
    cumExpenses += month.expenses;
    month.cumulativeRevenue = Math.round(cumRevenue * 100) / 100;
    month.cumulativeExpenses = Math.round(cumExpenses * 100) / 100;
    month.cumulativeResult = Math.round((cumRevenue - cumExpenses) * 100) / 100;
  });

  // Calculate YTD actuals
  const actualYTDRevenue = historicalRevenueValues.reduce((a, b) => a + b, 0);
  const actualYTDExpense = historicalExpenseValues.reduce((a, b) => a + b, 0);
  const actualYTD =
    actualYTDRevenue - actualYTDExpense;

  // Calculate annual projection
  const projectedTotalRevenue =
    actualYTDRevenue + revenueForecast.totalForecast;
  const projectedTotalExpense =
    actualYTDExpense + expenseForecast.totalForecast;
  const projectedResult = projectedTotalRevenue - projectedTotalExpense;

  const achievementPct = Math.round(
    ((currentMonth - 1) / 12) * 100
  );

  // Generate per-account forecasts
  const accountsGrouped = groupBookingsByAccount(currentBookings);
  const accountForecasts: AccountForecast[] = [];

  Object.entries(accountsGrouped).forEach(([accountStr, accountData]) => {
    const account = Number(accountStr);
    const values = Object.values(accountData.values);

    if (values.length === 0) {
      return;
    }

    const trendData = calculateTrend(values);
    const { slope, intercept, rSquared } = trendData;
    const seasonality = calculateSeasonalIndices(accountData.values);
    const accountForecast = forecastRemainingMonths(
      accountData.values,
      currentYear,
      currentMonth + 1,
      finalConfig.forecastHorizon,
      finalConfig.method as 'seasonal' | 'trend' | 'hybrid',
      seasonality,
      finalConfig.confidenceLevel
    );

    const annualActual = values.reduce((a, b) => a + b, 0);

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (slope > 0.01 * (annualActual / values.length)) {
      trend = 'increasing';
    } else if (slope < -0.01 * (annualActual / values.length)) {
      trend = 'decreasing';
    }

    accountForecasts.push({
      account,
      account_name: accountData.account_name,
      category: accountData.isRevenue ? 'revenue' : 'expense',
      monthlyData: accountForecast.monthlyData.map((d) => ({
        ...d,
        actual: accountData.values[d.period],
      })),
      annualProjection:
        annualActual + accountForecast.totalForecast,
      annualActual,
      remainingForecast: accountForecast.totalForecast,
      trend,
      seasonality,
      confidence: rSquared,
    });
  });

  // Generate insights
  const insights: ForecastInsight[] = [];

  // Trend insights
  accountForecasts.forEach((forecast) => {
    if (forecast.trend === 'increasing' && forecast.confidence > 0.5) {
      insights.push({
        type: 'trend',
        severity: forecast.category === 'revenue' ? 'positive' : 'warning',
        title: `${forecast.account_name} ${forecast.category === 'revenue' ? 'Wachstum' : 'Steigerung'}`,
        description: `${forecast.account_name} zeigt einen starken Aufwärtstrend.`,
        account: forecast.account,
        impact: forecast.remainingForecast,
      });
    } else if (forecast.trend === 'decreasing' && forecast.confidence > 0.5) {
      insights.push({
        type: 'trend',
        severity: forecast.category === 'revenue' ? 'warning' : 'positive',
        title: `${forecast.account_name} ${forecast.category === 'revenue' ? 'Rückgang' : 'Reduktion'}`,
        description: `${forecast.account_name} zeigt einen Abwärtstrend.`,
        account: forecast.account,
        impact: -forecast.remainingForecast,
      });
    }
  });

  // Risk: Personnel costs growing faster than revenue
  const personnelAccounts = accountForecasts.filter(
    (f) =>
      f.category === 'expense' &&
      f.account_name.toLowerCase().includes('personalkosten')
  );
  const revenueAccounts = accountForecasts.filter(
    (f) => f.category === 'revenue'
  );

  if (personnelAccounts.length > 0 && revenueAccounts.length > 0) {
    const personnelGrowth = personnelAccounts[0].remainingForecast /
      (personnelAccounts[0].annualActual || 1) *
      100;
    const revenueGrowth = revenueAccounts.reduce((sum, a) => sum + a.remainingForecast, 0) /
      (revenueAccounts.reduce((sum, a) => sum + a.annualActual, 0) || 1) *
      100;

    if (personnelGrowth > revenueGrowth) {
      insights.push({
        type: 'risk',
        severity: 'warning',
        title: 'Personalkosten wachsen schneller als Umsatz',
        description: 'Personalkosten steigen stärker als der Umsatzzuwachs.',
        impact:
          personnelAccounts[0].remainingForecast -
          revenueAccounts.reduce((sum, a) => sum + a.remainingForecast, 0),
      });
    }
  }

  // Opportunity insights
  const opportunityAccounts = accountForecasts.filter(
    (f) =>
      f.category === 'revenue' &&
      f.trend === 'increasing' &&
      f.confidence > 0.5
  );

  if (opportunityAccounts.length > 0) {
    insights.push({
      type: 'opportunity',
      severity: 'positive',
      title: 'Umsatzwachstum erkannt',
      description: `${opportunityAccounts.length} Umsatzkonten zeigen starkes Wachstum.`,
      impact: opportunityAccounts.reduce((sum, a) => a.remainingForecast, 0),
    });
  }

  // Year-end range (optimistic, expected, pessimistic)
  const standardError = 1.96 * 0.15 * projectedTotalRevenue; // Rough estimate: 15% uncertainty
  const yearEndRange = {
    optimistic: Math.round((projectedResult + standardError) * 100) / 100,
    expected: Math.round(projectedResult * 100) / 100,
    pessimistic: Math.round(
      (projectedResult - standardError) * 100
    ) / 100,
  };

  return {
    config: finalConfig,
    generatedAt: new Date().toISOString(),
    annualProjection: {
      totalRevenue: Math.round(projectedTotalRevenue * 100) / 100,
      totalExpenses: Math.round(projectedTotalExpense * 100) / 100,
      projectedResult: Math.round(projectedResult * 100) / 100,
      actualYTD: Math.round(actualYTD * 100) / 100,
      forecastRemaining: Math.round(
        (projectedResult - actualYTD) * 100
      ) / 100,
      achievementPct,
    },
    monthlyTimeline,
    accountForecasts: accountForecasts.sort((a, b) => b.annualProjection - a.annualProjection),
    insights,
    yearEndRange,
  };
}
