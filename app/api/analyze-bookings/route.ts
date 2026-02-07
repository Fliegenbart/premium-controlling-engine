/**
 * Analyze Bookings API
 * POST /api/analyze-bookings
 *
 * Accepts pre-parsed bookings (e.g., from Magic Upload)
 * instead of raw CSV files
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeBookings } from '@/lib/analysis';
import { analyzeBookingsSchema } from '@/lib/validation';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 15, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const parsed = analyzeBookingsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Ungültige Buchungsdaten', 400, requestId);
    }
    const { prevBookings, currBookings } = parsed.data;

    // Validate input
    if (!prevBookings || !Array.isArray(prevBookings) || prevBookings.length === 0) {
      return jsonError('Vorjahr-Buchungen fehlen oder sind leer', 400, requestId);
    }

    if (!currBookings || !Array.isArray(currBookings) || currBookings.length === 0) {
      return jsonError('Aktuelle Buchungen fehlen oder sind leer', 400, requestId);
    }

    // Run analysis
    const result = analyzeBookings(prevBookings, currBookings, {
      period_prev_name: 'Vorjahr',
      period_curr_name: 'Aktuelles Jahr',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bookings analysis error:', requestId, sanitizeError(error));
    return jsonError('Analyse fehlgeschlagen.', 500, requestId);
  }
}
