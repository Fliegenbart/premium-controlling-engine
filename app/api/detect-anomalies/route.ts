import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AccountDeviation } from '@/lib/types';
import { enrichWithBasicAnomalies } from '@/lib/anomaly-detection';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export async function POST(request: NextRequest) {
  try {
    const { deviations, apiKey, context } = await request.json();

    if (!deviations || !Array.isArray(deviations)) {
      return NextResponse.json(
        { error: 'Ungültige Abweichungsdaten' },
        { status: 400 }
      );
    }

    // If no API key, return rule-based anomalies
    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      const enriched = enrichWithBasicAnomalies(deviations);
      return NextResponse.json({
        deviations: enriched,
        detectedByAI: false,
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Only process top 10 deviations to save costs
    const topDeviations = deviations.slice(0, 10);

    const deviationsList = topDeviations
      .map(
        (d: AccountDeviation, i: number) =>
          `${i + 1}. ${d.account_name} (Konto ${d.account}): ` +
          `${formatCurrency(d.amount_prev)} → ${formatCurrency(d.amount_curr)} ` +
          `(${d.delta_pct >= 0 ? '+' : ''}${d.delta_pct.toFixed(1)}%)`
      )
      .join('\n');

    const prompt = `Du bist ein Controlling-Experte für die Labor/Diagnostik-Branche. Analysiere diese Abweichungen auf Anomalien.

${context?.quarter ? `Zeitraum: ${context.quarter}` : ''}
${context?.industry ? `Branche: ${context.industry}` : 'Branche: Labor/Diagnostik'}

Abweichungen:
${deviationsList}

Für JEDE ungewöhnliche Abweichung, gib einen kurzen Hinweis im folgenden JSON-Format:
{
  "anomalies": [
    {"index": 1, "hint": "Kurzer Hinweis (max 8 Wörter)", "type": "outlier|seasonal|trend_break|unusual_single", "severity": "info|warning|critical"}
  ]
}

Typen:
- outlier: Statistisch ungewöhnlicher Wert
- seasonal: Saisonale Abweichung (z.B. "Q2 typisch niedriger")
- trend_break: Plötzliche Trendänderung
- unusual_single: Auffällige Einzelposition

Nur WIRKLICH ungewöhnliche Fälle markieren. Normale Geschäftsschwankungen ignorieren.
Antworte NUR mit dem JSON, kein anderer Text.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = (response.content[0] as { type: string; text: string }).text;

    // Parse AI response
    let aiAnomalies: { index: number; hint: string; type: string; severity: string }[] = [];
    try {
      const parsed = JSON.parse(responseText);
      aiAnomalies = parsed.anomalies || [];
    } catch {
      // If parsing fails, try to extract JSON from text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          aiAnomalies = parsed.anomalies || [];
        } catch {
          // Fall back to rule-based
          const enriched = enrichWithBasicAnomalies(deviations);
          return NextResponse.json({
            deviations: enriched,
            detectedByAI: false,
            parseError: true,
          });
        }
      }
    }

    // Merge AI anomalies with deviations
    const enrichedDeviations = deviations.map((dev: AccountDeviation, idx: number) => {
      const aiAnomaly = aiAnomalies.find((a) => a.index === idx + 1);
      if (aiAnomaly) {
        return {
          ...dev,
          anomalyHint: aiAnomaly.hint,
          anomalyType: aiAnomaly.type as AccountDeviation['anomalyType'],
          anomalySeverity: aiAnomaly.severity as AccountDeviation['anomalySeverity'],
        };
      }
      return dev;
    });

    return NextResponse.json({
      deviations: enrichedDeviations,
      detectedByAI: true,
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);

    // Fall back to rule-based on error
    try {
      const { deviations } = await request.clone().json();
      if (deviations) {
        const enriched = enrichWithBasicAnomalies(deviations);
        return NextResponse.json({
          deviations: enriched,
          detectedByAI: false,
          error: 'KI-Erkennung fehlgeschlagen, Fallback verwendet',
        });
      }
    } catch {
      // Ignore
    }

    return NextResponse.json(
      { error: 'Fehler bei der Anomalie-Erkennung: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
