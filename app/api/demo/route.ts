/**
 * Demo Data API
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateVarianceScenario, DEMO_SCENARIOS, getScenarioDescription } from '@/lib/demo-data';
import { loadBookings } from '@/lib/duckdb-engine';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const requestId = getRequestId();
  const auth = await requireSessionUser(request, { permission: 'view', requestId });
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    success: true,
    scenarios: DEMO_SCENARIOS
  });
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'upload', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000, keyPrefix: '/api/demo' });
    if (rateLimit) return rateLimit;

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
    console.error('Demo data error:', requestId, sanitizeError(error));
    return jsonError('Demo-Daten konnten nicht geladen werden', 500, requestId);
  }
}
