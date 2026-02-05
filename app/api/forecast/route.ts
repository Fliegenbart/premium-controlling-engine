/**
 * Forecast API
 */

import { NextRequest, NextResponse } from 'next/server';
import { autoForecast, linearForecast, movingAverageForecast, exponentialForecast } from '@/lib/forecast';
import { getTimeSeries } from '@/lib/duckdb-engine';

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'Mindestens 3 Perioden für Forecast erforderlich' },
        { status: 400 }
      );
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
    console.error('Forecast error:', error);
    return NextResponse.json(
      { error: 'Forecast fehlgeschlagen', details: (error as Error).message },
      { status: 500 }
    );
  }
}
