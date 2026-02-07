import { NextRequest, NextResponse } from 'next/server';
import { AccountDeviation } from '@/lib/types';
import { enrichWithBasicAnomalies } from '@/lib/anomaly-detection';
import { getHybridLLMService } from '@/lib/llm/hybrid-service';
import { INJECTION_GUARD, sanitizeForPrompt, wrapUntrusted } from '@/lib/prompt-utils';
import { anomalyRequestSchema } from '@/lib/validation';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  let deviations: AccountDeviation[] = [];
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 25, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const parsed = anomalyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Ungültige Abweichungsdaten', 400, requestId);
    }
    deviations = parsed.data.deviations as AccountDeviation[];
    const context = parsed.data.context as Record<string, string> | undefined;

    if (!deviations || !Array.isArray(deviations)) {
      return jsonError('Ungültige Abweichungsdaten', 400, requestId);
    }

    const llm = getHybridLLMService();
    const status = await llm.getStatus();
    if (status.activeProvider === 'none') {
      const enriched = enrichWithBasicAnomalies(deviations);
      return NextResponse.json({
        deviations: enriched,
        detectedByAI: false,
      });
    }

    // Only process top 10 deviations to save costs
    const topDeviations = deviations.slice(0, 10);

    const deviationsList = topDeviations
      .map(
        (d: AccountDeviation, i: number) =>
          `${i + 1}. ${sanitizeForPrompt(d.account_name, 120)} (Konto ${d.account}): ` +
          `${formatCurrency(d.amount_prev)} → ${formatCurrency(d.amount_curr)} ` +
          `(${d.delta_pct >= 0 ? '+' : ''}${d.delta_pct.toFixed(1)}%)`
      )
      .join('\n');

    const prompt = `Du bist ein erfahrener Controlling-Experte. Analysiere diese Abweichungen auf Anomalien.
${INJECTION_GUARD}

${context?.quarter ? `Zeitraum: ${sanitizeForPrompt(context.quarter, 60)}` : ''}
${context?.industry ? `Branche: ${sanitizeForPrompt(context.industry, 80)}` : ''}

Abweichungen:
${wrapUntrusted('ABWEICHUNGEN', deviationsList, 1600)}

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

    const response = await llm.generate(prompt, {
      maxTokens: 500,
      temperature: 0.2,
    });

    const responseText = response.text || '';

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
    console.error('Anomaly detection error:', requestId, sanitizeError(error));

    if (deviations && deviations.length > 0) {
      const enriched = enrichWithBasicAnomalies(deviations);
      return NextResponse.json({
        deviations: enriched,
        detectedByAI: false,
        error: 'KI-Erkennung fehlgeschlagen, Fallback verwendet',
      });
    }

    return jsonError('Fehler bei der Anomalie-Erkennung.', 500, requestId);
  }
}
