import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { calculateCashflowStatement } from '@/lib/cashflow-engine';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const { bookings, period } = body as {
      bookings: unknown[];
      period?: string;
    };

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return jsonError('bookings array must exist and have at least one item', 400, requestId);
    }

    const result = calculateCashflowStatement(bookings as any[], { period });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = sanitizeError(error);
    console.error(`[${requestId}] Cashflow statement error:`, error);
    return jsonError(`Kapitalflussrechnung fehlgeschlagen: ${errorMessage}`, 500, requestId);
  }
}
