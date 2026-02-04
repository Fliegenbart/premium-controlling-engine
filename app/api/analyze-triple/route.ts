/**
 * Triple Analysis API - Plan vs Ist vs Vorjahr
 * POST /api/analyze-triple
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeTriple } from '@/lib/triple-analysis';
import { initDatabase } from '@/lib/duckdb-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tableVJ = 'controlling.bookings_vj',
      tablePlan = 'controlling.bookings_plan',
      tableIst = 'controlling.bookings_ist',
      wesentlichkeitAbs = 5000,
      wesentlichkeitPct = 5,
      includeTopBookings = true,
    } = body;

    // Initialize database
    await initDatabase(process.env.DATABASE_PATH);

    // Run triple analysis
    const result = await analyzeTriple(tableVJ, tablePlan, tableIst, {
      wesentlichkeitAbs,
      wesentlichkeitPct,
      includeTopBookings,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Triple analysis error:', error);
    return NextResponse.json(
      { error: `Analyse fehlgeschlagen: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
