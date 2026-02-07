import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { projectWeeklyCashflow } from '@/lib/liquidity-engine';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    // Rate limiting: 10 requests per 60 seconds
    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    // Parse request body
    const body = await request.json();
    const { bookings, startBalance, threshold = 50000, weeks = 13 } = body;

    // Validate required fields
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return jsonError('bookings array must exist and have at least one item', 400, requestId);
    }

    if (typeof startBalance !== 'number' || isNaN(startBalance)) {
      return jsonError('startBalance must be a valid number', 400, requestId);
    }

    // Project weekly cashflow
    const forecast = projectWeeklyCashflow({
      bookings,
      startBalance,
      threshold,
      weeks,
    });

    return NextResponse.json(forecast);
  } catch (error: unknown) {
    const errorMessage = sanitizeError(error);
    console.error(`[${requestId}] Liquidity forecast error:`, error);
    return jsonError(`Liquiditätsprognose fehlgeschlagen: ${errorMessage}`, 500, requestId);
  }
}
