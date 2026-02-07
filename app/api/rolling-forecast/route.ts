/**
 * Rolling Forecast API
 * POST /api/rolling-forecast
 *
 * Generates smart rolling forecast with seasonal adjustments
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRollingForecast, RollingForecastConfig } from '@/lib/rolling-forecast';
import { executeSQL } from '@/lib/duckdb-engine';
import { Booking } from '@/lib/types';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const {
      table = 'bookings',
      historyTable = 'bookings_history',
      config,
    } = body as {
      table?: string;
      historyTable?: string;
      config?: Partial<RollingForecastConfig>;
    };

    // Validate tables exist and contain data
    if (!table || typeof table !== 'string' || table.length === 0) {
      return jsonError('Ungültige Tabelle angegeben', 400, requestId);
    }

    // Fetch current year bookings
    let currentBookings: Booking[] = [];
    try {
      const result = await executeSQL(
        `SELECT * FROM "${table}" WHERE year(posting_date) = year(current_date) ORDER BY posting_date ASC`
      );
      currentBookings = (result.rows as unknown as Booking[]);
    } catch (error) {
      console.warn(`Could not fetch from ${table}:`, sanitizeError(error));
      // Table might not exist or be empty - continue with empty array
    }

    if (currentBookings.length === 0) {
      return jsonError('Keine aktuellen Buchungen gefunden', 404, requestId);
    }

    // Fetch historical bookings for seasonality detection (previous 2 years)
    let historicalBookings: Booking[] = [];
    try {
      const result = await executeSQL(
        `SELECT * FROM "${historyTable}"
         WHERE year(posting_date) >= year(current_date) - 2
         AND year(posting_date) < year(current_date)
         ORDER BY posting_date ASC LIMIT 10000`
      );
      historicalBookings = (result.rows as unknown as Booking[]);
    } catch (error) {
      console.warn(`Could not fetch from ${historyTable}:`, sanitizeError(error));
      // History table might not exist - continue without it
    }

    // Generate forecast
    const forecast = generateRollingForecast(currentBookings, historicalBookings, config);

    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Rolling forecast error:', requestId, sanitizeError(error));
    return jsonError('Forecast-Generierung fehlgeschlagen', 500, requestId);
  }
}
