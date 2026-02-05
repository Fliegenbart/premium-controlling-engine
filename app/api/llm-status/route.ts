/**
 * LLM Status API - Check availability of Claude and Ollama
 */

import { NextResponse } from 'next/server';
import { getHybridLLMService } from '@/lib/llm/hybrid-service';

export async function GET() {
  try {
    const llm = getHybridLLMService();
    const status = await llm.getStatus();

    return NextResponse.json({
      success: true,
      status: {
        ollamaAvailable: status.ollamaAvailable,
        claudeAvailable: status.claudeAvailable,
        preferredProvider: status.preferredProvider,
        activeProvider: status.activeProvider,
        message: status.ollamaAvailable
          ? '🟢 Lokales LLM (Ollama) verfügbar - Daten bleiben On-Premise'
          : status.claudeAvailable
          ? '🟡 Cloud LLM (Claude) aktiv - Daten werden verschlüsselt übertragen'
          : '🔴 Kein LLM verfügbar - Nur regelbasierte Kommentare',
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      status: {
        ollamaAvailable: false,
        claudeAvailable: false,
        preferredProvider: 'none',
        activeProvider: 'none',
        message: '🔴 Fehler beim Prüfen der LLM-Verfügbarkeit',
      },
    });
  }
}
