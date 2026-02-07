import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { calculateBWA } from '@/lib/bwa-engine';
import { Booking } from '@/lib/types';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const { bookings, prevBookings, period } = body;

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return jsonError('bookings array must exist and have at least one item', 400, requestId);
    }

    const validBookings = bookings.every(
      (b: unknown) =>
        typeof b === 'object' &&
        b !== null &&
        'posting_date' in b &&
        'amount' in b &&
        'account' in b &&
        'account_name' in b
    );

    if (!validBookings) {
      return jsonError('Invalid booking format', 400, requestId);
    }

    const prevBookingsValid = !prevBookings || (Array.isArray(prevBookings) && prevBookings.every(
      (b: unknown) =>
        typeof b === 'object' &&
        b !== null &&
        'posting_date' in b &&
        'amount' in b &&
        'account' in b &&
        'account_name' in b
    ));

    if (!prevBookingsValid) {
      return jsonError('Invalid previous bookings format', 400, requestId);
    }

    const result = calculateBWA(
      bookings as Booking[],
      prevBookings ? (prevBookings as Booking[]) : undefined,
      { period }
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = sanitizeError(error);
    console.error(`[${requestId}] BWA calculation error:`, error);
    return jsonError(`BWA-Berechnung fehlgeschlagen: ${errorMessage}`, 500, requestId);
  }
}
