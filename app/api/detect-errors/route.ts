/**
 * Smart Booking Error Detection API
 * POST /api/detect-errors
 *
 * Detects intelligent accounting errors using pattern analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectBookingErrors } from '@/lib/booking-error-detection';
import { executeSQL, sanitizeQualifiedTableName } from '@/lib/duckdb-engine';
import { Booking } from '@/lib/types';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 20, windowMs: 60_000, keyPrefix: '/api/detect-errors' });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const requestedTable =
      body && typeof body.table === 'string'
        ? body.table
        : 'controlling.bookings_curr';
    const requestedPrevTable =
      body && typeof body.prevTable === 'string'
        ? body.prevTable
        : 'controlling.bookings_prev';
    const table = sanitizeQualifiedTableName(requestedTable, {
      allowedSchemas: ['controlling', 'staging', 'analysis'],
    });
    const prevTable = sanitizeQualifiedTableName(requestedPrevTable, {
      allowedSchemas: ['controlling', 'staging', 'analysis'],
    });

    // Fetch current bookings from table
    let currentResult;
    try {
      currentResult = await executeSQL(`SELECT * FROM ${table}`);
    } catch (error) {
      return NextResponse.json(
        { error: `Tabelle ${table} nicht gefunden` },
        { status: 400 }
      );
    }

    if (currentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Keine Daten in der Tabelle gefunden' },
        { status: 400 }
      );
    }

    // Convert to Booking format
    const currentBookings: Booking[] = currentResult.rows.map((row) => ({
      posting_date: String(row.posting_date || ''),
      amount: Number(row.amount) || 0,
      account: Number(row.account) || 0,
      account_name: String(row.account_name || ''),
      cost_center: row.cost_center ? String(row.cost_center) : '',
      profit_center: row.profit_center ? String(row.profit_center) : '',
      vendor: row.vendor ? String(row.vendor) : null,
      customer: row.customer ? String(row.customer) : null,
      document_no: String(row.document_no || ''),
      text: String(row.text || ''),
    }));

    // Fetch previous bookings if available (optional)
    let previousBookings: Booking[] | undefined;
    try {
      const prevResult = await executeSQL(`SELECT * FROM ${prevTable}`);
      if (prevResult.rows.length > 0) {
        previousBookings = prevResult.rows.map((row) => ({
          posting_date: String(row.posting_date || ''),
          amount: Number(row.amount) || 0,
          account: Number(row.account) || 0,
          account_name: String(row.account_name || ''),
          cost_center: row.cost_center ? String(row.cost_center) : '',
          profit_center: row.profit_center ? String(row.profit_center) : '',
          vendor: row.vendor ? String(row.vendor) : null,
          customer: row.customer ? String(row.customer) : null,
          document_no: String(row.document_no || ''),
          text: String(row.text || ''),
        }));
      }
    } catch (error) {
      // Previous table not found is ok - just skip
      console.log(`Previous table ${prevTable} not found, continuing without it`);
    }

    // Run error detection
    const detectionResult = detectBookingErrors(currentBookings, previousBookings);

    return NextResponse.json({
      success: true,
      table,
      prevTable: previousBookings ? prevTable : null,
      bookingCount: currentBookings.length,
      ...detectionResult,
    });
  } catch (error) {
    console.error('Error detection failed:', requestId, sanitizeError(error));
    return jsonError('Fehleranalyse fehlgeschlagen', 500, requestId);
  }
}
