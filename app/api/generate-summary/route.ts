import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult } from '@/lib/types';

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
  try {
    const { analysisResult, apiKey, entityName } = await request.json();

    if (!analysisResult || !analysisResult.meta || !analysisResult.by_account) {
      return NextResponse.json(
        { error: 'Ungültige Analysedaten' },
        { status: 400 }
      );
    }

    // If no API key, return rule-based summary
    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return NextResponse.json({
        summary: generateFallbackSummary(analysisResult),
        generatedByAI: false,
        generatedAt: new Date().toISOString(),
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const topDeviations = analysisResult.by_account.slice(0, 5);
    const deviationsList = topDeviations
      .map((d: { account_name: string; delta_abs: number; delta_pct: number }) =>
        `- ${d.account_name}: ${formatCurrency(d.delta_abs)} (${d.delta_pct >= 0 ? '+' : ''}${d.delta_pct.toFixed(1)}%)`
      )
      .join('\n');

    const prompt = `Du bist ein erfahrener Controller. Erstelle eine Management Summary (3-5 Sätze) auf Deutsch für diese Abweichungsanalyse.

${entityName ? `Gesellschaft: ${entityName}` : ''}
Zeitraum: ${analysisResult.meta.period_prev} vs. ${analysisResult.meta.period_curr}
Gesamtabweichung: ${formatCurrency(analysisResult.summary.total_delta)}

Top 5 Abweichungen:
${deviationsList}

Fokussiere auf:
1. Gesamtbild der finanziellen Entwicklung (besser/schlechter als Vorjahr)
2. Die kritischsten Abweichungen und mögliche Ursachen
3. Eine kurze Handlungsempfehlung

Schreibe sachlich und prägnant. Keine Überschriften, nur Fließtext.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const summaryText = (response.content[0] as { type: string; text: string }).text;

    return NextResponse.json({
      summary: summaryText,
      generatedByAI: true,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Summary generation error:', error);

    // Try to return fallback on error
    try {
      const { analysisResult } = await request.clone().json();
      if (analysisResult) {
        return NextResponse.json({
          summary: generateFallbackSummary(analysisResult),
          generatedByAI: false,
          generatedAt: new Date().toISOString(),
          error: 'KI-Generierung fehlgeschlagen, Fallback verwendet',
        });
      }
    } catch {
      // Ignore parse error
    }

    return NextResponse.json(
      { error: 'Fehler bei der Summary-Generierung: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
