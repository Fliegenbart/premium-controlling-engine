import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult } from '@/lib/types';
import { simulateScenario, ScenarioParameter, ScenarioResult } from '@/lib/scenario-engine';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export interface ScenarioRequest {
  data: AnalysisResult;
  parameters: ScenarioParameter[];
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    // Rate limiting
    const rateLimit = enforceRateLimit(request, { limit: 50, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    // Parse request body
    const body = await request.json();
    const { data, parameters } = body as ScenarioRequest;

    // Validation
    if (!data || !Array.isArray(parameters)) {
      return jsonError(
        'Ungültige Anfrage: data und parameters erforderlich',
        400,
        requestId,
      );
    }

    if (!data.by_account || !Array.isArray(data.by_account)) {
      return jsonError(
        'Ungültige Analysedaten: by_account Array erforderlich',
        400,
        requestId,
      );
    }

    if (data.by_account.length === 0) {
      return jsonError(
        'Analysedaten enthalten keine Konten',
        400,
        requestId,
      );
    }

    // Validate parameters
    const validatedParameters = parameters.filter(p => {
      if (
        typeof p.id !== 'string' ||
        typeof p.baseValue !== 'number' ||
        typeof p.currentValue !== 'number'
      ) {
        return false;
      }
      return true;
    });

    if (validatedParameters.length === 0) {
      return jsonError(
        'Keine gültigen Parameter gefunden',
        400,
        requestId,
      );
    }

    // Run simulation
    const result = simulateScenario(data, validatedParameters) as ScenarioResult;

    // Ensure all numeric values are finite
    if (
      !isFinite(result.projectedResult.revenue) ||
      !isFinite(result.projectedResult.expenses) ||
      !isFinite(result.projectedResult.result)
    ) {
      return jsonError(
        'Simulationsergebnis ist ungültig',
        500,
        requestId,
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
        requestId,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMessage = sanitizeError(error);
    console.error(`[${requestId}] Scenario simulation error:`, error);

    return jsonError(
      `Szenario-Simulation fehlgeschlagen: ${errorMessage}`,
      500,
      requestId,
    );
  }
}
