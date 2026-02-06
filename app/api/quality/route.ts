/**
 * Quality Checks API
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQualityChecks } from '@/lib/quality-checks';
import { executeSQL } from '@/lib/duckdb-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table = 'controlling.bookings_curr' } = body;

    // Fetch all bookings from table
    const result = await executeSQL(`SELECT * FROM ${table}`);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Keine Daten in der Tabelle gefunden' },
        { status: 400 }
      );
    }

    // Convert to Booking format
    const bookings = result.rows.map(row => ({
      posting_date: String(row.posting_date || ''),
      amount: Number(row.amount) || 0,
      account: Number(row.account) || 0,
      account_name: String(row.account_name || ''),
      cost_center: row.cost_center ? String(row.cost_center) : '',
      profit_center: row.profit_center ? String(row.profit_center) : '',
      vendor: row.vendor ? String(row.vendor) : null,
      customer: row.customer ? String(row.customer) : null,
      document_no: String(row.document_no || ''),
      text: String(row.text || '')
    }));

    // Run quality checks
    const report = runQualityChecks(bookings);

    return NextResponse.json({
      success: true,
      table,
      ...report
    });
  } catch (error) {
    console.error('Quality check error:', error);
    return NextResponse.json(
      { error: 'Qualitätsprüfung fehlgeschlagen', details: (error as Error).message },
      { status: 500 }
    );
  }
}
