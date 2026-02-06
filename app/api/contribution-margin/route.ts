import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { calculateContributionMargin } from '@/lib/contribution-engine';
import type { Dimension } from '@/lib/contribution-types';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const { bookings, dimension = 'total', period } = body as {
      bookings: unknown[];
      dimension?: Dimension;
      period?: string;
    };

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return jsonError('bookings array must exist and have at least one item', 400, requestId);
    }

    const result = calculateContributionMargin(bookings as any[], { dimension, period });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = sanitizeError(error);
    console.error(`[${requestId}] Contribution margin error:`, error);
    return jsonError(`Deckungsbeitragsrechnung fehlgeschlagen: ${errorMessage}`, 500, requestId);
  }
}
