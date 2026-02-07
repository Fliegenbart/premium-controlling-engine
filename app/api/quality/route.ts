/**
 * Quality Checks API
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQualityChecks } from '@/lib/quality-checks';
import { executeSQL, sanitizeQualifiedTableName } from '@/lib/duckdb-engine';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 20, windowMs: 60_000, keyPrefix: '/api/quality' });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const requestedTable =
      body && typeof body.table === 'string'
        ? body.table
        : 'controlling.bookings_curr';
    const table = sanitizeQualifiedTableName(requestedTable, {
      allowedSchemas: ['controlling', 'staging', 'analysis'],
    });

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
    console.error('Quality check error:', requestId, sanitizeError(error));
    return jsonError('Qualitätsprüfung fehlgeschlagen', 500, requestId);
  }
}
