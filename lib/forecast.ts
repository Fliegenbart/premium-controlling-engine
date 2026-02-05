/**
 * Forecasting Module
 * Simple linear regression and trend analysis
 */

import { TimeSeriesPoint } from './types';

export interface ForecastResult {
  historical: TimeSeriesPoint[];
  forecast: ForecastPoint[];
  model: {
    type: 'linear' | 'moving_average' | 'exponential';
    slope: number;
    intercept: number;
    r_squared: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trend_strength: 'strong' | 'moderate' | 'weak';
  };
  statistics: {
    mean: number;
    std_dev: number;
    min: number;
    max: number;
    growth_rate: number;
  };
}

export interface ForecastPoint {
  period: string;
  value: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
}

/**
 * Linear regression forecast
 */
export function linearForecast(
  data: TimeSeriesPoint[],
  periodsAhead: number = 3
): ForecastResult {
  if (data.length < 3) {
    throw new Error('Mindestens 3 Datenpunkte für Forecast erforderlich');
  }

  const n = data.length;
  const values = data.map(d => d.value);

  // X values (0, 1, 2, ...)
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;

  // Calculate means
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
    denominator += (x[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += (y[i] - predicted) ** 2;
    ssTot += (y[i] - yMean) ** 2;
  }

  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

  // Standard error for prediction intervals
  const stdError = Math.sqrt(ssRes / (n - 2));

  // Statistics
  const min = Math.min(...values);
  const max = Math.max(...values);
  const stdDev = Math.sqrt(values.map(v => (v - yMean) ** 2).reduce((a, b) => a + b, 0) / n);
  const growthRate = values.length > 1
    ? ((values[values.length - 1] - values[0]) / Math.abs(values[0])) * 100
    : 0;

  // Determine trend
  const trendStrength = Math.abs(rSquared) > 0.7 ? 'strong' : Math.abs(rSquared) > 0.4 ? 'moderate' : 'weak';
  const trend = slope > 0.01 * yMean ? 'increasing' : slope < -0.01 * yMean ? 'decreasing' : 'stable';

  // Generate forecast points
  const forecast: ForecastPoint[] = [];
  const lastPeriod = new Date(data[data.length - 1].period);

  for (let i = 1; i <= periodsAhead; i++) {
    const futureX = n + i - 1;
    const predictedValue = slope * futureX + intercept;

    // Prediction interval (95%)
    const tValue = 1.96; // Approximation for large samples
    const margin = tValue * stdError * Math.sqrt(1 + 1 / n + ((futureX - xMean) ** 2) / denominator);

    // Calculate next period
    const nextPeriod = new Date(lastPeriod);
    nextPeriod.setMonth(nextPeriod.getMonth() + i);

    forecast.push({
      period: nextPeriod.toISOString().slice(0, 7), // YYYY-MM format
      value: Math.round(predictedValue * 100) / 100,
      lower_bound: Math.round((predictedValue - margin) * 100) / 100,
      upper_bound: Math.round((predictedValue + margin) * 100) / 100,
      confidence: 0.95
    });
  }

  return {
    historical: data,
    forecast,
    model: {
      type: 'linear',
      slope: Math.round(slope * 100) / 100,
      intercept: Math.round(intercept * 100) / 100,
      r_squared: Math.round(rSquared * 1000) / 1000,
      trend,
      trend_strength: trendStrength
    },
    statistics: {
      mean: Math.round(yMean * 100) / 100,
      std_dev: Math.round(stdDev * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      growth_rate: Math.round(growthRate * 10) / 10
    }
  };
}

/**
 * Moving average forecast
 */
export function movingAverageForecast(
  data: TimeSeriesPoint[],
  windowSize: number = 3,
  periodsAhead: number = 3
): ForecastResult {
  if (data.length < windowSize) {
    throw new Error(`Mindestens ${windowSize} Datenpunkte für Moving Average erforderlich`);
  }

  const values = data.map(d => d.value);
  const n = data.length;

  // Calculate moving averages
  const movingAverages: number[] = [];
  for (let i = windowSize - 1; i < n; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    movingAverages.push(window.reduce((a, b) => a + b, 0) / windowSize);
  }

  // Last MA value for forecasting
  const lastMA = movingAverages[movingAverages.length - 1];

  // Calculate variance for confidence intervals
  const variance = values.map((v, i) => {
    if (i < windowSize - 1) return 0;
    const ma = movingAverages[i - windowSize + 1];
    return (v - ma) ** 2;
  }).reduce((a, b) => a + b, 0) / (n - windowSize + 1);

  const stdDev = Math.sqrt(variance);

  // Generate forecast
  const forecast: ForecastPoint[] = [];
  const lastPeriod = new Date(data[data.length - 1].period);

  for (let i = 1; i <= periodsAhead; i++) {
    const nextPeriod = new Date(lastPeriod);
    nextPeriod.setMonth(nextPeriod.getMonth() + i);

    forecast.push({
      period: nextPeriod.toISOString().slice(0, 7),
      value: Math.round(lastMA * 100) / 100,
      lower_bound: Math.round((lastMA - 1.96 * stdDev) * 100) / 100,
      upper_bound: Math.round((lastMA + 1.96 * stdDev) * 100) / 100,
      confidence: 0.95
    });
  }

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const growthRate = ((values[n - 1] - values[0]) / Math.abs(values[0])) * 100;

  return {
    historical: data,
    forecast,
    model: {
      type: 'moving_average',
      slope: 0,
      intercept: lastMA,
      r_squared: 0,
      trend: 'stable',
      trend_strength: 'weak'
    },
    statistics: {
      mean: Math.round(mean * 100) / 100,
      std_dev: Math.round(stdDev * 100) / 100,
      min: Math.round(Math.min(...values) * 100) / 100,
      max: Math.round(Math.max(...values) * 100) / 100,
      growth_rate: Math.round(growthRate * 10) / 10
    }
  };
}

/**
 * Exponential smoothing forecast
 */
export function exponentialForecast(
  data: TimeSeriesPoint[],
  alpha: number = 0.3,
  periodsAhead: number = 3
): ForecastResult {
  if (data.length < 2) {
    throw new Error('Mindestens 2 Datenpunkte erforderlich');
  }

  const values = data.map(d => d.value);
  const n = data.length;

  // Calculate smoothed values
  const smoothed: number[] = [values[0]];
  for (let i = 1; i < n; i++) {
    smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
  }

  const lastSmoothed = smoothed[smoothed.length - 1];

  // Calculate error variance
  const errors = values.map((v, i) => v - smoothed[i]);
  const mse = errors.map(e => e ** 2).reduce((a, b) => a + b, 0) / n;
  const stdError = Math.sqrt(mse);

  // Generate forecast
  const forecast: ForecastPoint[] = [];
  const lastPeriod = new Date(data[data.length - 1].period);

  for (let i = 1; i <= periodsAhead; i++) {
    const nextPeriod = new Date(lastPeriod);
    nextPeriod.setMonth(nextPeriod.getMonth() + i);

    // Widening confidence interval
    const margin = 1.96 * stdError * Math.sqrt(i);

    forecast.push({
      period: nextPeriod.toISOString().slice(0, 7),
      value: Math.round(lastSmoothed * 100) / 100,
      lower_bound: Math.round((lastSmoothed - margin) * 100) / 100,
      upper_bound: Math.round((lastSmoothed + margin) * 100) / 100,
      confidence: 0.95
    });
  }

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(values.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / n);
  const growthRate = ((values[n - 1] - values[0]) / Math.abs(values[0])) * 100;

  return {
    historical: data,
    forecast,
    model: {
      type: 'exponential',
      slope: 0,
      intercept: lastSmoothed,
      r_squared: 0,
      trend: lastSmoothed > mean ? 'increasing' : lastSmoothed < mean ? 'decreasing' : 'stable',
      trend_strength: 'moderate'
    },
    statistics: {
      mean: Math.round(mean * 100) / 100,
      std_dev: Math.round(stdDev * 100) / 100,
      min: Math.round(Math.min(...values) * 100) / 100,
      max: Math.round(Math.max(...values) * 100) / 100,
      growth_rate: Math.round(growthRate * 10) / 10
    }
  };
}

/**
 * Auto-select best forecast method
 */
export function autoForecast(
  data: TimeSeriesPoint[],
  periodsAhead: number = 3
): ForecastResult {
  // Try linear first
  const linear = linearForecast(data, periodsAhead);

  // If R² is good, use linear
  if (linear.model.r_squared > 0.5) {
    return linear;
  }

  // Otherwise use exponential smoothing
  return exponentialForecast(data, 0.3, periodsAhead);
}
