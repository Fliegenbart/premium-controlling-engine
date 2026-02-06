import { Booking } from './types';

/**
 * Multi-Period Trend Analysis Engine
 * Supports 3-5 years of data for deep controlling insights
 */

export interface TrendPeriod {
  label: string;        // e.g. "2022", "2023", "Q1 2024"
  bookings: Booking[];
  totals: {
    revenue: number;
    expenses: number;
    result: number;
  };
}

export interface AccountTrend {
  account: number;
  account_name: string;
  periods: {
    label: string;
    amount: number;
    bookingCount: number;
  }[];
  // Statistical analysis
  trend: 'rising' | 'falling' | 'stable' | 'volatile';
  cagr: number;                    // Compound Annual Growth Rate
  movingAverage: number[];         // 3-period moving average
  standardDeviation: number;
  coefficientOfVariation: number;  // CV = stddev / mean (volatility indicator)
  // Forecast
  forecast: {
    nextPeriod: number;
    method: 'linear' | 'exponential' | 'moving_average';
    confidence: number;
  };
  // Anomalies in time series
  anomalies: {
    period: string;
    expected: number;
    actual: number;
    deviation: number;
  }[];
}

export interface CostCenterTrend {
  cost_center: string;
  periods: { label: string; amount: number }[];
  trend: 'rising' | 'falling' | 'stable' | 'volatile';
  cagr: number;
}

export interface TrendAnalysisResult {
  meta: {
    periodCount: number;
    periodLabels: string[];
    totalBookings: number;
    analysisDate: string;
  };
  // Overall P&L trend
  pnlTrend: {
    periods: {
      label: string;
      revenue: number;
      expenses: number;
      result: number;
      margin: number; // result/revenue %
    }[];
    revenueTrend: 'rising' | 'falling' | 'stable';
    marginTrend: 'improving' | 'declining' | 'stable';
    revenueCagr: number;
    expenseCagr: number;
  };
  // Per-account trends
  accountTrends: AccountTrend[];
  // Per cost center trends
  costCenterTrends: CostCenterTrend[];
  // Alerts: accounts that significantly deviate from their trend
  alerts: TrendAlert[];
}

export interface TrendAlert {
  type: 'trend_break' | 'acceleration' | 'deceleration' | 'new_volatility' | 'threshold_breach';
  severity: 'info' | 'warning' | 'critical';
  account?: number;
  account_name?: string;
  cost_center?: string;
  message: string;
  data: Record<string, number>;
}

// ============================================
// Helper Functions
// ============================================

function isRevenueAccount(account: number): boolean {
  return account >= 4000 && account < 5000;
}

function isExpenseAccount(account: number): boolean {
  return account >= 5000 && account < 9000;
}

function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    const existing = map.get(k) || [];
    existing.push(item);
    map.set(k, existing);
  }
  return map;
}

function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((sum, item) => sum + fn(item), 0);
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 * CAGR = (Ending Value / Beginning Value) ^ (1 / Number of Years) - 1
 */
function calculateCAGR(startValue: number, endValue: number, periods: number): number {
  if (startValue === 0 || periods < 1) return 0;
  if (startValue < 0 && endValue < 0) {
    // Both negative: use absolute values
    const cagr = Math.pow(Math.abs(endValue) / Math.abs(startValue), 1 / periods) - 1;
    return endValue < startValue ? cagr : -cagr;
  }
  if (startValue > 0 && endValue > 0) {
    return Math.pow(endValue / startValue, 1 / periods) - 1;
  }
  // Sign change: cannot calculate meaningful CAGR
  return 0;
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Perform simple linear regression
 * Returns {slope, intercept, rSquared}
 */
function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, rSquared: 0 };

  const xMean = (n - 1) / 2; // Average x position
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    const dy = values[i] - yMean;
    numerator += dx * dy;
    denominator += dx * dx;
    ssRes += dy * dy; // Will calculate residual later
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  ssTot = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  ssRes = values.reduce((sum, y, i) => {
    const predicted = intercept + slope * i;
    return sum + Math.pow(y - predicted, 2);
  }, 0);

  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}

/**
 * Calculate 3-period moving average
 */
function calculateMovingAverage(values: number[], period: number = 3): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(values[i]); // Not enough data points yet
    } else {
      const window = values.slice(i - period + 1, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      result.push(avg);
    }
  }
  return result;
}

/**
 * Detect trend direction based on regression slope
 */
function detectTrend(
  values: number[],
  stdDev: number,
  slope: number
): 'rising' | 'falling' | 'stable' | 'volatile' {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const cv = Math.abs(mean) > 0 ? stdDev / Math.abs(mean) : 0;

  // High volatility check
  if (cv > 0.5) return 'volatile';

  // Trend direction
  if (Math.abs(slope) < stdDev * 0.1) {
    return 'stable';
  }

  return slope > 0 ? 'rising' : 'falling';
}

/**
 * Simple linear forecast: predict next value based on trend
 */
function forecastNextPeriod(
  values: number[],
  method: 'linear' | 'exponential' | 'moving_average' = 'linear'
): { nextPeriod: number; method: 'linear' | 'exponential' | 'moving_average'; confidence: number } {
  if (values.length === 0) return { nextPeriod: 0, method, confidence: 0 };

  if (method === 'linear') {
    const regression = linearRegression(values);
    const nextPeriod = regression.intercept + regression.slope * values.length;
    return {
      nextPeriod,
      method: 'linear',
      confidence: Math.max(0, Math.min(1, regression.rSquared)),
    };
  }

  if (method === 'exponential') {
    if (values.some(v => v <= 0)) {
      // Fall back to linear for non-positive values
      const regression = linearRegression(values);
      return {
        nextPeriod: regression.intercept + regression.slope * values.length,
        method: 'linear',
        confidence: Math.max(0, Math.min(1, regression.rSquared)),
      };
    }
    const logValues = values.map(v => Math.log(v));
    const regression = linearRegression(logValues);
    const nextPeriod = Math.exp(regression.intercept + regression.slope * values.length);
    return {
      nextPeriod,
      method: 'exponential',
      confidence: Math.max(0, Math.min(1, regression.rSquared)),
    };
  }

  // Moving average
  const ma = calculateMovingAverage(values, 3);
  const nextPeriod = ma[ma.length - 1];
  return {
    nextPeriod,
    method: 'moving_average',
    confidence: 0.6,
  };
}

/**
 * Detect anomalies: values > 2 standard deviations from trend
 */
function detectAnomalies(
  periods: string[],
  values: number[]
): Array<{ period: string; expected: number; actual: number; deviation: number }> {
  if (values.length < 3) return [];

  const regression = linearRegression(values);
  const stdDev = calculateStandardDeviation(values);
  const anomalies: Array<{ period: string; expected: number; actual: number; deviation: number }> = [];

  for (let i = 0; i < values.length; i++) {
    const expected = regression.intercept + regression.slope * i;
    const deviation = Math.abs(values[i] - expected);
    const deviationStdDevs = stdDev !== 0 ? deviation / stdDev : 0;

    if (deviationStdDevs > 2) {
      anomalies.push({
        period: periods[i],
        expected,
        actual: values[i],
        deviation,
      });
    }
  }

  return anomalies;
}

/**
 * Generate trend alerts for significant changes
 */
function generateAlerts(
  accountTrends: AccountTrend[],
  costCenterTrends: CostCenterTrend[],
  pnlTrend: TrendAnalysisResult['pnlTrend']
): TrendAlert[] {
  const alerts: TrendAlert[] = [];

  // Check for trend breaks in accounts
  for (const accountTrend of accountTrends) {
    const periods = accountTrend.periods.length;
    if (periods < 3) continue;

    // Trend break: sudden change in direction
    const values = accountTrend.periods.map(p => p.amount);
    const firstHalf = values.slice(0, Math.floor(periods / 2));
    const secondHalf = values.slice(Math.floor(periods / 2));

    const firstTrend = linearRegression(firstHalf).slope;
    const secondTrend = linearRegression(secondHalf).slope;

    if (firstTrend * secondTrend < 0) {
      // Sign change indicates trend break
      alerts.push({
        type: 'trend_break',
        severity: accountTrend.cagr > 0.2 || accountTrend.cagr < -0.2 ? 'critical' : 'warning',
        account: accountTrend.account,
        account_name: accountTrend.account_name,
        message: `Trendwechsel für Konto ${accountTrend.account}: ${firstTrend > 0 ? 'Wachstum zu Rückgang' : 'Rückgang zu Wachstum'}`,
        data: { firstHalfSlope: firstTrend, secondHalfSlope: secondTrend },
      });
    }

    // Acceleration/Deceleration
    if (accountTrend.periods.length >= 3) {
      const cv = accountTrend.coefficientOfVariation;
      if (cv > 0.5) {
        alerts.push({
          type: 'new_volatility',
          severity: 'warning',
          account: accountTrend.account,
          account_name: accountTrend.account_name,
          message: `Erhöhte Volatilität für Konto ${accountTrend.account}: Variationskoeffizient ${(cv * 100).toFixed(1)}%`,
          data: { coefficientOfVariation: cv },
        });
      }
    }

    // Anomalies
    if (accountTrend.anomalies.length > 0) {
      for (const anomaly of accountTrend.anomalies) {
        alerts.push({
          type: 'threshold_breach',
          severity: 'warning',
          account: accountTrend.account,
          account_name: accountTrend.account_name,
          message: `Anomalie in Periode ${anomaly.period}: Erwartet ${anomaly.expected.toFixed(0)}, erhalten ${anomaly.actual.toFixed(0)}`,
          data: {
            period: anomaly.period as unknown as number,
            expected: anomaly.expected,
            actual: anomaly.actual,
            deviation: anomaly.deviation,
          },
        });
      }
    }
  }

  // Revenue trend alerts
  if (pnlTrend.revenueTrend === 'falling') {
    alerts.push({
      type: 'trend_break',
      severity: pnlTrend.revenueCagr < -0.1 ? 'critical' : 'warning',
      message: `Umsatzrückgang: CAGR ${(pnlTrend.revenueCagr * 100).toFixed(1)}%`,
      data: { revenueCagr: pnlTrend.revenueCagr },
    });
  }

  // Margin trend alerts
  if (pnlTrend.marginTrend === 'declining') {
    alerts.push({
      type: 'deceleration',
      severity: 'warning',
      message: 'Gewinnmarge verschlechtert sich',
      data: { marginTrend: pnlTrend.marginTrend as unknown as number },
    });
  }

  return alerts;
}

// ============================================
// Main Analysis Function
// ============================================

export function analyzeTrends(periods: TrendPeriod[]): TrendAnalysisResult {
  if (periods.length === 0) {
    throw new Error('At least one period required for trend analysis');
  }

  const periodLabels = periods.map(p => p.label);
  const totalBookings = sumBy(periods, p => p.bookings.length);

  // ========== P&L TREND ANALYSIS ==========
  const pnlPeriods = periods.map(period => {
    const revenue = period.totals.revenue;
    const expenses = period.totals.expenses;
    const result = period.totals.result;
    const margin = revenue !== 0 ? (result / revenue) * 100 : 0;

    return {
      label: period.label,
      revenue,
      expenses,
      result,
      margin,
    };
  });

  const revenueValues = pnlPeriods.map(p => p.revenue);
  const expenseValues = pnlPeriods.map(p => p.expenses);
  const marginValues = pnlPeriods.map(p => p.margin);

  const revenueRegression = linearRegression(revenueValues);
  const expenseRegression = linearRegression(expenseValues);
  const marginRegression = linearRegression(marginValues);

  const revenueTrend = detectTrend(revenueValues, calculateStandardDeviation(revenueValues), revenueRegression.slope);
  const marginTrend = marginValues[marginValues.length - 1] > marginValues[0] ? 'improving' : 'declining';

  const revenueCagr = calculateCAGR(revenueValues[0], revenueValues[revenueValues.length - 1], periods.length - 1);
  const expenseCagr = calculateCAGR(expenseValues[0], expenseValues[expenseValues.length - 1], periods.length - 1);

  // ========== ACCOUNT TREND ANALYSIS ==========
  // Aggregate bookings by account across all periods
  const accountData = new Map<number, Map<string, { label: string; amount: number; bookingCount: number }[]>>();

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const byAccount = groupBy(period.bookings, b => JSON.stringify([b.account, b.account_name]));

    for (const [key, bookings] of byAccount.entries()) {
      const [accountStr, accountName] = JSON.parse(key) as [string, string];
      const account = parseInt(accountStr);

      if (!accountData.has(account)) {
        accountData.set(account, new Map());
      }

      const accountMap = accountData.get(account)!;
      if (!accountMap.has(accountName)) {
        accountMap.set(accountName, []);
      }

      const amount = sumBy(bookings, b => b.amount);
      accountMap.get(accountName)!.push({
        label: period.label,
        amount,
        bookingCount: bookings.length,
      });
    }
  }

  const accountTrends: AccountTrend[] = [];

  for (const [account, nameMap] of accountData.entries()) {
    for (const [accountName, periodData] of nameMap.entries()) {
      // Ensure we have data for all periods
      const fullPeriodData = periodLabels.map(label => {
        const existing = periodData.find(p => p.label === label);
        return existing || { label, amount: 0, bookingCount: 0 };
      });

      const amounts = fullPeriodData.map(p => p.amount);
      const stdDev = calculateStandardDeviation(amounts);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const cv = Math.abs(mean) > 0 ? stdDev / Math.abs(mean) : 0;

      const regression = linearRegression(amounts);
      const trend = detectTrend(amounts, stdDev, regression.slope);

      const cagr = calculateCAGR(amounts[0], amounts[amounts.length - 1], periods.length - 1);
      const movingAverage = calculateMovingAverage(amounts, 3);
      const anomalies = detectAnomalies(periodLabels, amounts);

      // Determine forecast method
      let forecastMethod: 'linear' | 'exponential' | 'moving_average' = 'linear';
      if (amounts.every(v => v > 0)) {
        forecastMethod = 'exponential';
      }

      const forecast = forecastNextPeriod(amounts, forecastMethod);

      accountTrends.push({
        account,
        account_name: accountName,
        periods: fullPeriodData,
        trend,
        cagr,
        movingAverage,
        standardDeviation: stdDev,
        coefficientOfVariation: cv,
        forecast,
        anomalies,
      });
    }
  }

  // Sort by absolute CAGR (most interesting trends first)
  accountTrends.sort((a, b) => Math.abs(b.cagr) - Math.abs(a.cagr));

  // ========== COST CENTER TREND ANALYSIS ==========
  const costCenterData = new Map<string, { label: string; amount: number }[]>();

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const byCostCenter = groupBy(period.bookings, b => b.cost_center);

    for (const [costCenter, bookings] of byCostCenter.entries()) {
      if (!costCenterData.has(costCenter)) {
        costCenterData.set(costCenter, []);
      }

      const amount = sumBy(bookings, b => b.amount);
      costCenterData.get(costCenter)!.push({
        label: period.label,
        amount,
      });
    }
  }

  const costCenterTrends: CostCenterTrend[] = [];

  for (const [costCenter, periodData] of costCenterData.entries()) {
    const fullPeriodData = periodLabels.map(label => {
      const existing = periodData.find(p => p.label === label);
      return { label, amount: existing?.amount || 0 };
    });

    const amounts = fullPeriodData.map(p => p.amount);
    const stdDev = calculateStandardDeviation(amounts);
    const regression = linearRegression(amounts);
    const trend = detectTrend(amounts, stdDev, regression.slope);
    const cagr = calculateCAGR(amounts[0], amounts[amounts.length - 1], periods.length - 1);

    costCenterTrends.push({
      cost_center: costCenter,
      periods: fullPeriodData,
      trend,
      cagr,
    });
  }

  costCenterTrends.sort((a, b) => Math.abs(b.cagr) - Math.abs(a.cagr));

  // ========== GENERATE ALERTS ==========
  const pnlTrendData = {
    periods: pnlPeriods,
    revenueTrend: revenueTrend as 'rising' | 'falling' | 'stable',
    marginTrend: marginTrend as 'improving' | 'declining' | 'stable',
    revenueCagr,
    expenseCagr,
  };

  const alerts = generateAlerts(accountTrends, costCenterTrends, pnlTrendData);

  // ========== RETURN RESULT ==========
  return {
    meta: {
      periodCount: periods.length,
      periodLabels,
      totalBookings,
      analysisDate: new Date().toISOString(),
    },
    pnlTrend: pnlTrendData,
    accountTrends: accountTrends.slice(0, 50), // Top 50 accounts by CAGR
    costCenterTrends: costCenterTrends.slice(0, 20), // Top 20 cost centers
    alerts: alerts.sort((a, b) => {
      const severityRank = { critical: 0, warning: 1, info: 2 };
      return severityRank[a.severity] - severityRank[b.severity];
    }),
  };
}

/**
 * Helper to prepare TrendPeriod from raw bookings
 */
export function prepareTrendPeriod(label: string, bookings: Booking[]): TrendPeriod {
  const revenue = sumBy(bookings.filter(b => isRevenueAccount(b.account)), b => b.amount);
  const expenses = sumBy(bookings.filter(b => isExpenseAccount(b.account)), b => b.amount);

  return {
    label,
    bookings,
    totals: {
      revenue,
      expenses,
      result: revenue + expenses, // Note: expenses are typically negative
    },
  };
}
