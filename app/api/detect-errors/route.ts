/**
 * Smart Booking Error Detection API
 * POST /api/detect-errors
 *
 * Detects intelligent accounting errors using pattern analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectBookingErrors } from '@/lib/booking-error-detection';
import { executeSQL } from '@/lib/duckdb-engine';
import { Booking } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table = 'controlling.bookings_curr', prevTable = 'controlling.bookings_prev' } = body;

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
    console.error('Error detection failed:', error);
    return NextResponse.json(
      {
        error: 'Fehleranalyse fehlgeschlagen',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
