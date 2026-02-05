/**
 * Enhanced Analysis API with Domain-RAG and Hybrid LLM
 * - Uses SKR03 knowledge base for context
 * - Supports both Claude (cloud) and Ollama (local)
 * - Automatic red flag detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeBookings, parseCSV } from '@/lib/analysis';
import { getKnowledgeService, RedFlagResult } from '@/lib/rag/knowledge-service';
import { getHybridLLMService, LLMResponse } from '@/lib/llm/hybrid-service';
import { AnalysisResult, AccountDeviation } from '@/lib/types';

interface EnhancedDeviation extends AccountDeviation {
  ragContext?: string;
  redFlags?: RedFlagResult[];
  aiComment?: string;
  aiProvider?: 'claude' | 'ollama';
  aiLatencyMs?: number;
}

interface EnhancedAnalysisResult extends AnalysisResult {
  by_account: EnhancedDeviation[];
  llmStatus?: {
    provider: 'claude' | 'ollama' | 'none';
    ollamaAvailable: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prevFile = formData.get('prevFile') as File;
    const currFile = formData.get('currFile') as File;
    const apiKey = formData.get('apiKey') as string | null;
    const periodPrev = (formData.get('periodPrev') as string) || 'Vorjahr';
    const periodCurr = (formData.get('periodCurr') as string) || 'Aktuelles Jahr';
    const wesentlichkeitAbs = parseInt(formData.get('wesentlichkeitAbs') as string) || 5000;
    const wesentlichkeitPct = parseInt(formData.get('wesentlichkeitPct') as string) || 10;
    const useRAG = formData.get('useRAG') !== 'false'; // Default: true
    const useAI = formData.get('useAI') !== 'false'; // Default: true
    const forceProvider = formData.get('forceProvider') as 'claude' | 'ollama' | null;

    if (!prevFile || !currFile) {
      return NextResponse.json(
        { error: 'Beide CSV-Dateien sind erforderlich' },
        { status: 400 }
      );
    }

    // Parse CSV files
    const prevText = await prevFile.text();
    const currText = await currFile.text();
    const prevBookings = parseCSV(prevText);
    const currBookings = parseCSV(currText);

    if (prevBookings.length === 0 || currBookings.length === 0) {
      return NextResponse.json(
        { error: 'CSV-Dateien konnten nicht gelesen werden oder sind leer' },
        { status: 400 }
      );
    }

    // Run base analysis
    let result: EnhancedAnalysisResult = analyzeBookings(prevBookings, currBookings, {
      period_prev_name: periodPrev,
      period_curr_name: periodCurr,
      wesentlichkeit_abs: wesentlichkeitAbs,
      wesentlichkeit_pct: wesentlichkeitPct,
    }) as EnhancedAnalysisResult;

    // Initialize services
    const knowledge = getKnowledgeService();
    const llm = getHybridLLMService({ claudeApiKey: apiKey || undefined });

    // Get LLM status
    const llmStatus = await llm.getStatus();
    result.llmStatus = {
      provider: llmStatus.activeProvider,
      ollamaAvailable: llmStatus.ollamaAvailable,
    };

    // Calculate total revenue for benchmarks
    const totalRevenue = Math.abs(result.summary.erloese_curr);

    // Enhance each deviation with RAG context and AI comments
    const enhancedDeviations: EnhancedDeviation[] = [];

    for (const deviation of result.by_account.slice(0, 10)) { // Top 10
      const enhanced: EnhancedDeviation = { ...deviation };

      // Add RAG context
      if (useRAG) {
        const currentMonth = new Date().getMonth() + 1;
        enhanced.ragContext = knowledge.buildPromptContext(
          deviation.account,
          deviation.delta_pct,
          currentMonth
        );

        // Calculate percent of revenue for benchmarks
        const percentOfRevenue = totalRevenue > 0
          ? (Math.abs(deviation.amount_curr) / totalRevenue) * 100
          : 0;

        // Check red flags
        enhanced.redFlags = knowledge.checkRedFlags(
          deviation.account,
          deviation.delta_pct,
          deviation.delta_abs,
          {
            percentOfRevenue,
            isNewBookingType: (deviation.new_bookings?.length || 0) > 0,
            hasMissingBookings: (deviation.missing_bookings?.length || 0) > 0,
          }
        );

        // Set anomaly hints based on red flags
        if (enhanced.redFlags.length > 0) {
          const criticalFlags = enhanced.redFlags.filter(f => f.severity === 'critical');
          const warningFlags = enhanced.redFlags.filter(f => f.severity === 'warning');

          if (criticalFlags.length > 0) {
            enhanced.anomalySeverity = 'critical';
            enhanced.anomalyHint = criticalFlags[0].flag;
          } else if (warningFlags.length > 0) {
            enhanced.anomalySeverity = 'warning';
            enhanced.anomalyHint = warningFlags[0].flag;
          } else {
            enhanced.anomalySeverity = 'info';
            enhanced.anomalyHint = enhanced.redFlags[0].flag;
          }
        }
      }

      // Generate AI comment with RAG context
      if (useAI && (apiKey || llmStatus.ollamaAvailable)) {
        try {
          const aiResponse = await generateRAGComment(
            enhanced,
            result.meta,
            llm,
            forceProvider || undefined
          );

          enhanced.aiComment = aiResponse.text;
          enhanced.aiProvider = aiResponse.provider;
          enhanced.aiLatencyMs = aiResponse.latencyMs;
          enhanced.comment = aiResponse.text; // Override default comment
        } catch (error) {
          console.error('AI comment error for account', deviation.account, error);
          // Keep rule-based comment
        }
      }

      enhancedDeviations.push(enhanced);
    }

    // Add remaining deviations without AI enhancement
    for (const deviation of result.by_account.slice(10)) {
      enhancedDeviations.push(deviation);
    }

    result.by_account = enhancedDeviations;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Analyse: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function generateRAGComment(
  deviation: EnhancedDeviation,
  meta: { period_prev: string; period_curr: string },
  llm: ReturnType<typeof getHybridLLMService>,
  forceProvider?: 'claude' | 'ollama'
): Promise<LLMResponse> {
  const isExpense = deviation.account >= 5000;

  // Build top bookings context
  const topBookingsContext = deviation.top_bookings_curr
    ?.slice(0, 5)
    .map(b => `- ${b.date}: "${b.text}" (Beleg: ${b.document_no}) - ${formatCurrency(b.amount)}`)
    .join('\n') || 'Keine Details verfügbar';

  // Build new/missing bookings context
  let changeContext = '';
  if (deviation.new_bookings && deviation.new_bookings.length > 0) {
    changeContext += '\n\nNeue Buchungsarten im aktuellen Jahr:\n';
    changeContext += deviation.new_bookings
      .slice(0, 3)
      .map(b => `- "${b.text}" (${b.vendor || 'k.A.'}): ${formatCurrency(b.amount)}`)
      .join('\n');
  }
  if (deviation.missing_bookings && deviation.missing_bookings.length > 0) {
    changeContext += '\n\nIm Vorjahr vorhanden, jetzt fehlend:\n';
    changeContext += deviation.missing_bookings
      .slice(0, 3)
      .map(b => `- "${b.text}" (${b.vendor || 'k.A.'}): ${formatCurrency(b.amount)}`)
      .join('\n');
  }

  // Build red flags context
  let redFlagsContext = '';
  if (deviation.redFlags && deviation.redFlags.length > 0) {
    redFlagsContext = '\n\n⚠️ Automatisch erkannte Warnsignale:\n';
    redFlagsContext += deviation.redFlags
      .map(f => `- [${f.severity.toUpperCase()}] ${f.flag}`)
      .join('\n');
  }

  const systemPrompt = `Du bist ein erfahrener Controller bei einem Labordiagnostik-Unternehmen der Limbach Gruppe.
Du analysierst Abweichungen zwischen Perioden und gibst präzise, faktenbasierte Kommentare.
Beziehe dich auf konkrete Belegnummern aus den Buchungen.
Schreibe auf Deutsch, professionell aber verständlich.`;

  const prompt = `Analysiere diese Abweichung und erstelle einen kurzen Kommentar (3-4 Sätze):

ABWEICHUNGSDATEN:
Konto: ${deviation.account} - ${deviation.account_name}
${meta.period_prev}: ${formatCurrency(deviation.amount_prev)}
${meta.period_curr}: ${formatCurrency(deviation.amount_curr)}
Abweichung: ${formatCurrency(deviation.delta_abs)} (${deviation.delta_pct.toFixed(1)}%)
Typ: ${isExpense ? 'Aufwandskonto' : 'Ertragskonto'}
Anzahl Buchungen: ${deviation.bookings_count_prev || 0} → ${deviation.bookings_count_curr || 0}

TOP BUCHUNGEN IM AKTUELLEN JAHR:
${topBookingsContext}
${changeContext}
${deviation.ragContext || ''}
${redFlagsContext}

ANWEISUNGEN:
1. Erkläre die Richtung der Abweichung (positiv/negativ für das Unternehmen)
2. Nenne die wahrscheinlichste Ursache basierend auf den Buchungstexten
3. Referenziere mindestens eine Belegnummer
4. Gib eine Einschätzung: [Erwartbar/Prüfenswert/Kritisch]

Antworte NUR mit dem Kommentar, ohne Einleitung.`;

  return llm.generate(prompt, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 400,
    forceProvider,
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
