import { NextRequest, NextResponse } from 'next/server';
import { analyzeBookings, parseCSV } from '@/lib/analysis';
import { AnalysisResult } from '@/lib/types';
import { getHybridLLMService } from '@/lib/llm/hybrid-service';
import { INJECTION_GUARD, sanitizeForPrompt, wrapUntrusted } from '@/lib/prompt-utils';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError, validateUploadFile } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const formData = await request.formData();
    const prevFile = formData.get('prevFile') as File;
    const currFile = formData.get('currFile') as File;
    const periodPrev = (formData.get('periodPrev') as string) || 'Vorjahr';
    const periodCurr = (formData.get('periodCurr') as string) || 'Aktuelles Jahr';
    const wesentlichkeitAbs = parseInt(formData.get('wesentlichkeitAbs') as string) || 5000;
    const wesentlichkeitPct = parseInt(formData.get('wesentlichkeitPct') as string) || 10;

    if (!prevFile || !currFile) {
      return jsonError('Beide CSV-Dateien sind erforderlich', 400, requestId);
    }

    const prevFileError = validateUploadFile(prevFile, {
      maxBytes: 50 * 1024 * 1024,
      allowedExtensions: ['.csv'],
      label: 'Vorjahr-Datei',
    });
    if (prevFileError) return jsonError(prevFileError, 400, requestId);

    const currFileError = validateUploadFile(currFile, {
      maxBytes: 50 * 1024 * 1024,
      allowedExtensions: ['.csv'],
      label: 'Aktuelle Datei',
    });
    if (currFileError) return jsonError(currFileError, 400, requestId);

    if (wesentlichkeitAbs < 0 || wesentlichkeitAbs > 10_000_000) {
      return jsonError('Wesentlichkeit (absolut) außerhalb des erlaubten Bereichs', 400, requestId);
    }
    if (wesentlichkeitPct < 0 || wesentlichkeitPct > 100) {
      return jsonError('Wesentlichkeit (%) außerhalb des erlaubten Bereichs', 400, requestId);
    }

    // Parse CSV files
    const prevText = await prevFile.text();
    const currText = await currFile.text();

    const prevBookings = parseCSV(prevText);
    const currBookings = parseCSV(currText);

    if (prevBookings.length === 0 || currBookings.length === 0) {
      return jsonError('CSV-Dateien konnten nicht gelesen werden oder sind leer', 400, requestId);
    }

    // Run analysis
    let result = analyzeBookings(prevBookings, currBookings, {
      period_prev_name: periodPrev,
      period_curr_name: periodCurr,
      wesentlichkeit_abs: wesentlichkeitAbs,
      wesentlichkeit_pct: wesentlichkeitPct,
    });

    // Enhance with AI comments if LLM available
    const llm = getHybridLLMService();
    const status = await llm.getStatus();
    if (status.activeProvider !== 'none') {
      result = await enhanceWithAIComments(result);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', requestId, sanitizeError(error));
    return jsonError('Fehler bei der Analyse.', 500, requestId);
  }
}

async function enhanceWithAIComments(
  result: AnalysisResult
): Promise<AnalysisResult> {
  const llm = getHybridLLMService();

  // Only enhance top 5 account deviations to save API costs
  const topDeviations = result.by_account.slice(0, 5);

  const systemPrompt = `Du bist ein Controlling-Experte. Analysiere Abweichungen und schreibe kurze, prägnante Kommentare (max. 3 Sätze) auf Deutsch.
${INJECTION_GUARD}`;

  const tasks = topDeviations.map(async (dev) => {
    const isExpense = dev.account >= 5000;
    const topBookings = dev.top_bookings
      ?.map(b => `- ${sanitizeForPrompt(b.text || '', 120)} (${sanitizeForPrompt(b.vendor || b.customer || 'k.A.', 60)}): ${formatCurrency(b.amount)}`)
      .join('\n') || 'Keine Details verfügbar';

    const prompt = `ANALYSE:
Konto: ${dev.account} - ${sanitizeForPrompt(dev.account_name, 120)}
${sanitizeForPrompt(result.meta.period_prev, 60)}: ${formatCurrency(dev.amount_prev)}
${sanitizeForPrompt(result.meta.period_curr, 60)}: ${formatCurrency(dev.amount_curr)}
Abweichung: ${formatCurrency(dev.delta_abs)} (${dev.delta_pct.toFixed(1)}%)
Typ: ${isExpense ? 'Aufwandskonto' : 'Ertragskonto'}

${wrapUntrusted('TOP BUCHUNGEN AKTUELL', topBookings, 1200)}

ANWEISUNG:
1. Richtung der Abweichung bewerten (positiv/negativ für das Unternehmen)
2. Mögliche Ursachen basierend auf den Buchungstexten nennen
3. Hinweis zur weiteren Prüfung geben (falls relevant)`;

    const response = await llm.generate(prompt, {
      systemPrompt,
      maxTokens: 300,
      temperature: 0.3,
    });

    return response.text?.trim() || '';
  });

  const results = await Promise.allSettled(tasks);
  results.forEach((res, idx) => {
    if (res.status === 'fulfilled' && res.value) {
      result.by_account[idx].comment = res.value;
    }
  });

  return result;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
