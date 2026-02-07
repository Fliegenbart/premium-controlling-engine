/**
 * Agent API - Intelligent Analysis (Local only)
 * POST /api/agent
 *
 * Uses Ollama for local inference.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLocalAgent } from '@/lib/local-agent';
import { getOllamaClient, RECOMMENDED_MODELS } from '@/lib/ollama-client';
// Dynamic import — DuckDB native module may not be available at build time
// import { initDatabase } from '@/lib/duckdb-engine';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

interface AgentRequest {
  question: string;
  context?: {
    periodPrev?: string;
    periodCurr?: string;
    totalDeviation?: number;
    topAccounts?: Array<{ account: number; name: string; delta: number }>;
  };
  model?: string;   // Local model override
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 15, windowMs: 60_000 });
    if (rateLimit) return rateLimit as NextResponse;

    const body: AgentRequest = await request.json();
    const { question, context, model } = body;
    
    if (!question || typeof question !== 'string') {
      return jsonError('Frage ist erforderlich', 400, requestId);
    }
    
    // Initialize DuckDB (dynamic import — native module may not exist at build time)
    try {
      const { initDatabase } = await import('@/lib/duckdb-engine');
      await initDatabase(process.env.DATABASE_PATH);
    } catch {
      console.warn('DuckDB not available — skipping database init');
    }
    
    // Local mode with Ollama
    console.log('Using local LLM (Ollama)');

    const localAgent = getLocalAgent(model);

    // Check if Ollama is ready
    const readyCheck = await localAgent.isReady();
    if (!readyCheck.ready) {
      return jsonError(`Ollama nicht bereit. ${readyCheck.error || ''}`.trim(), 503, requestId);
    }

    const response = await localAgent.answer(question, context);

    // Add model info to response
    return NextResponse.json({
      ...response,
      model: readyCheck.model,
      mode: 'local'
    });
    
  } catch (error) {
    console.error('Agent error:', requestId, sanitizeError(error));
    return jsonError('Analyse fehlgeschlagen.', 500, requestId);
  }
}

/**
 * GET /api/agent - Check Ollama status and available models
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId();
  const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
  if (auth instanceof NextResponse) return auth;

  const ollama = getOllamaClient();
  const health = await ollama.healthCheck();
  
  return NextResponse.json({
    ollama: {
      healthy: health.healthy,
      error: health.error,
      models: health.models,
    },
    recommended: RECOMMENDED_MODELS,
    defaultModel: process.env.OLLAMA_MODEL || RECOMMENDED_MODELS.primary,
  });
}
