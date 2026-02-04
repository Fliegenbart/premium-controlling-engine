/**
 * Agent API - Intelligent Analysis (Local + Cloud)
 * POST /api/agent
 * 
 * Supports:
 * - Local mode (Ollama) - DEFAULT, no API key needed
 * - Cloud mode (Anthropic) - if API key provided
 */

import { NextRequest, NextResponse } from 'next/server';
import { LocalControllingAgent, getLocalAgent } from '@/lib/local-agent';
import { ControllingAgent } from '@/lib/agent';
import { getOllamaClient, RECOMMENDED_MODELS } from '@/lib/ollama-client';
import { initDatabase } from '@/lib/duckdb-engine';
import { AgentResponse } from '@/lib/types';

interface AgentRequest {
  question: string;
  context?: {
    periodPrev?: string;
    periodCurr?: string;
    totalDeviation?: number;
    topAccounts?: Array<{ account: number; name: string; delta: number }>;
  };
  apiKey?: string;  // If provided, use cloud API
  model?: string;   // Local model override
  forceLocal?: boolean;  // Force local even if API key present
}

export async function POST(request: NextRequest): Promise<NextResponse<AgentResponse | { error: string }>> {
  try {
    const body: AgentRequest = await request.json();
    const { question, context, apiKey, model, forceLocal } = body;
    
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Frage ist erforderlich' },
        { status: 400 }
      );
    }
    
    // Initialize DuckDB
    await initDatabase(process.env.DATABASE_PATH);
    
    // Decide: Local (Ollama) or Cloud (Anthropic)
    const useCloud = apiKey && !forceLocal;
    
    if (useCloud) {
      // Cloud mode with Anthropic
      console.log('Using cloud API (Anthropic)');
      const agent = new ControllingAgent(apiKey);
      const response = await agent.answer(question, context);
      return NextResponse.json({
        ...response,
        mode: 'cloud',
        model: 'claude-sonnet-4'
      });
    } else {
      // Local mode with Ollama
      console.log('Using local LLM (Ollama)');
      
      const localAgent = getLocalAgent(model);
      
      // Check if Ollama is ready
      const readyCheck = await localAgent.isReady();
      if (!readyCheck.ready) {
        return NextResponse.json({
          error: `Ollama nicht bereit: ${readyCheck.error}. Bitte starte Ollama mit: ollama serve`,
        }, { status: 503 });
      }
      
      const response = await localAgent.answer(question, context);
      
      // Add model info to response
      return NextResponse.json({
        ...response,
        model: readyCheck.model,
        mode: 'local'
      });
    }
    
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: `Analyse fehlgeschlagen: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent - Check Ollama status and available models
 */
export async function GET(): Promise<NextResponse> {
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
