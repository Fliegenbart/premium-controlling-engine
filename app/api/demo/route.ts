/**
 * Demo Data API
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateVarianceScenario, DEMO_SCENARIOS, getScenarioDescription } from '@/lib/demo-data';
import { loadBookings } from '@/lib/duckdb-engine';

export async function GET() {
  return NextResponse.json({
    success: true,
    scenarios: DEMO_SCENARIOS
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario = 'mixed' } = body;

    // Generate demo data
    const { prevYear, currYear, plan } = generateVarianceScenario(
      scenario as 'stable' | 'growth' | 'cost_increase' | 'mixed'
    );

    // Load into DuckDB
    const prevResult = await loadBookings(prevYear, 'bookings_prev', 'controlling');
    const currResult = await loadBookings(currYear, 'bookings_curr', 'controlling');
    const planResult = await loadBookings(plan, 'bookings_plan', 'controlling');

    return NextResponse.json({
      success: true,
      scenario,
      description: getScenarioDescription(scenario),
      loaded: {
        prevYear: {
          rowCount: prevResult.rowCount,
          profile: prevResult.profile
        },
        currYear: {
          rowCount: currResult.rowCount,
          profile: currResult.profile
        },
        plan: {
          rowCount: planResult.rowCount,
          profile: planResult.profile
        }
      }
    });
  } catch (error) {
    console.error('Demo data error:', error);
    return NextResponse.json(
      { error: 'Demo-Daten konnten nicht geladen werden', details: (error as Error).message },
      { status: 500 }
    );
  }
}
