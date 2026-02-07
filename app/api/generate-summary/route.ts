import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult } from '@/lib/types';
import { getHybridLLMService } from '@/lib/llm/hybrid-service';
import { INJECTION_GUARD, sanitizeForPrompt, wrapUntrusted } from '@/lib/prompt-utils';
import { summaryRequestSchema } from '@/lib/validation';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

function generateFallbackSummary(result: AnalysisResult): string {
  const delta = result.summary.total_delta;
  const direction = delta > 0 ? 'höher' : 'niedriger';
  const topDeviation = result.by_account[0];

  let summary = `Die Gesamtkosten liegen um ${formatCurrency(Math.abs(delta))} ${direction} als im Vorjahreszeitraum.`;

  if (topDeviation) {
    summary += ` Die größte Abweichung zeigt ${topDeviation.account_name} mit ${formatCurrency(Math.abs(topDeviation.delta_abs))}.`;
  }

  summary += ` Insgesamt wurden ${result.by_account.length} wesentliche Abweichungen identifiziert.`;

  return summary;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  let analysisResult: AnalysisResult | null = null;
  let entityName: string | undefined;
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 30, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const parsed = summaryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Ungültige Analysedaten', 400, requestId);
    }
    analysisResult = parsed.data.analysisResult as AnalysisResult;
    entityName = parsed.data.entityName;

    if (!analysisResult || !analysisResult.meta || !analysisResult.by_account) {
      return jsonError('Ungültige Analysedaten', 400, requestId);
    }

    const llm = getHybridLLMService();
    const status = await llm.getStatus();
    if (status.activeProvider === 'none') {
      return NextResponse.json({
        summary: generateFallbackSummary(analysisResult),
        generatedByAI: false,
        generatedAt: new Date().toISOString(),
      });
    }

    const topDeviations = analysisResult.by_account.slice(0, 5);
    const deviationsList = topDeviations
      .map((d: { account_name: string; delta_abs: number; delta_pct: number }) =>
        `- ${sanitizeForPrompt(d.account_name, 120)}: ${formatCurrency(d.delta_abs)} (${d.delta_pct >= 0 ? '+' : ''}${d.delta_pct.toFixed(1)}%)`
      )
      .join('\n');

    const prompt = `Du bist ein erfahrener Controller. Erstelle eine Management Summary (3-5 Sätze) auf Deutsch für diese Abweichungsanalyse.
${INJECTION_GUARD}

${entityName ? `Gesellschaft: ${sanitizeForPrompt(entityName, 120)}` : ''}
Zeitraum: ${sanitizeForPrompt(analysisResult.meta.period_prev, 60)} vs. ${sanitizeForPrompt(analysisResult.meta.period_curr, 60)}
Gesamtabweichung: ${formatCurrency(analysisResult.summary.total_delta)}

Top 5 Abweichungen:
${wrapUntrusted('TOP ABWEICHUNGEN', deviationsList, 1200)}

Fokussiere auf:
1. Gesamtbild der finanziellen Entwicklung (besser/schlechter als Vorjahr)
2. Die kritischsten Abweichungen und mögliche Ursachen
3. Eine kurze Handlungsempfehlung

Schreibe sachlich und prägnant. Keine Überschriften, nur Fließtext.`;

    const response = await llm.generate(prompt, {
      maxTokens: 400,
      temperature: 0.3,
    });

    const summaryText = response.text || '';

    return NextResponse.json({
      summary: summaryText,
      generatedByAI: true,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Summary generation error:', requestId, sanitizeError(error));

    if (analysisResult) {
      return NextResponse.json({
        summary: generateFallbackSummary(analysisResult),
        generatedByAI: false,
        generatedAt: new Date().toISOString(),
        error: 'KI-Generierung fehlgeschlagen, Fallback verwendet',
      });
    }

    return jsonError('Fehler bei der Summary-Generierung.', 500, requestId);
  }
}
