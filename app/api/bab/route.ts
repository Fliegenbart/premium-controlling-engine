import { NextRequest, NextResponse } from 'next/server';
import { Booking } from '@/lib/types';
import { calculateBAB } from '@/lib/bab-engine';
import {
  getRequestId,
  enforceRateLimit,
  jsonError,
  sanitizeError,
} from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
  if (auth instanceof NextResponse) return auth;

  const rateLimitError = enforceRateLimit(request, {
    limit: 10,
    windowMs: 60_000,
  });
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const { bookings } = body as { bookings: Booking[] };

    if (!Array.isArray(bookings)) {
      return jsonError(
        'Buchungen müssen ein Array sein',
        400,
        requestId
      );
    }

    if (bookings.length === 0) {
      return Response.json(
        {
          costCenters: [],
          costCategories: [],
          overheadRates: {
            materialOverheadRate: 0,
            productionOverheadRate: 0,
            adminOverheadRate: 0,
            salesOverheadRate: 0,
          },
          allocationMatrix: [],
          summary: {
            totalDirectCosts: 0,
            totalOverheadCosts: 0,
            totalCosts: 0,
            overheadRatio: 0,
            costPerCostCenter: {},
          },
          insights: [],
        },
        { status: 200 }
      );
    }

    const result = calculateBAB(bookings);

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error('BAB calculation error:', error);
    return jsonError(
      `Fehler bei BAB-Berechnung: ${sanitizeError(error)}`,
      500,
      requestId
    );
  }
}
