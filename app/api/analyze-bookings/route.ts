/**
 * Analyze Bookings API
 * POST /api/analyze-bookings
 *
 * Accepts pre-parsed bookings (e.g., from Magic Upload)
 * instead of raw CSV files
 */

import { NextRequest, NextResponse } from 'next/server';
import { Booking, AnalysisResult } from '@/lib/types';
import { analyzeBookings } from '@/lib/analysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prevBookings, currBookings, apiKey } = body as {
      prevBookings: Booking[];
      currBookings: Booking[];
      apiKey?: string;
    };

    // Validate input
    if (!prevBookings || !Array.isArray(prevBookings) || prevBookings.length === 0) {
      return NextResponse.json(
        { error: 'Vorjahr-Buchungen fehlen oder sind leer' },
        { status: 400 }
      );
    }

    if (!currBookings || !Array.isArray(currBookings) || currBookings.length === 0) {
      return NextResponse.json(
        { error: 'Aktuelle Buchungen fehlen oder sind leer' },
        { status: 400 }
      );
    }

    // Run analysis
    const result = analyzeBookings(prevBookings, currBookings, {
      use_ai_comments: !!(apiKey || process.env.ANTHROPIC_API_KEY),
      api_key: apiKey || process.env.ANTHROPIC_API_KEY,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bookings analysis error:', error);
    return NextResponse.json(
      { error: 'Analyse fehlgeschlagen: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
