/**
 * LLM Status API - Check availability of Ollama
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHybridLLMService } from '@/lib/llm/hybrid-service';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const rateLimit = enforceRateLimit(request, { limit: 60, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const llm = getHybridLLMService();
    const status = await llm.getStatus();

    return NextResponse.json({
      success: true,
      status: {
        ollamaAvailable: status.ollamaAvailable,
        preferredProvider: status.preferredProvider,
        activeProvider: status.activeProvider,
        message: status.ollamaAvailable
          ? '🟢 Lokales LLM (Ollama) verfügbar - Daten bleiben On-Premise'
          : '🔴 Kein LLM verfügbar - Nur regelbasierte Kommentare',
      },
    });
  } catch (error) {
    console.error('LLM status error:', requestId, sanitizeError(error));
    return jsonError('Fehler beim Prüfen der LLM-Verfügbarkeit', 500, requestId);
  }
}
