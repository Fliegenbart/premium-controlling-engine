/**
 * Forecast API
 */

import { NextRequest, NextResponse } from 'next/server';
import { autoForecast, linearForecast, movingAverageForecast, exponentialForecast } from '@/lib/forecast';
import { getTimeSeries } from '@/lib/duckdb-engine';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 20, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const {
      table = 'controlling.bookings_curr',
      method = 'auto',
      periodsAhead = 3,
      metric = 'amount',
      groupBy = 'month'
    } = body;

    // Get time series data
    const timeSeries = await getTimeSeries(table, metric, groupBy);

    if (timeSeries.length < 3) {
      return jsonError('Mindestens 3 Perioden für Forecast erforderlich', 400, requestId);
    }

    // Run forecast
    let result;
    switch (method) {
      case 'linear':
        result = linearForecast(timeSeries, periodsAhead);
        break;
      case 'moving_average':
        result = movingAverageForecast(timeSeries, 3, periodsAhead);
        break;
      case 'exponential':
        result = exponentialForecast(timeSeries, 0.3, periodsAhead);
        break;
      case 'auto':
      default:
        result = autoForecast(timeSeries, periodsAhead);
    }

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Forecast error:', requestId, sanitizeError(error));
    return jsonError('Forecast fehlgeschlagen', 500, requestId);
  }
}
