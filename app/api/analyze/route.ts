import { NextRequest, NextResponse } from 'next/server';
import { analyzeBookings, parseCSV } from '@/lib/analysis';
import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult } from '@/lib/types';

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

    // Run analysis
    let result = analyzeBookings(prevBookings, currBookings, {
      period_prev_name: periodPrev,
      period_curr_name: periodCurr,
      wesentlichkeit_abs: wesentlichkeitAbs,
      wesentlichkeit_pct: wesentlichkeitPct,
    });

    // Enhance with AI comments if API key provided
    if (apiKey && apiKey.startsWith('sk-ant-')) {
      result = await enhanceWithAIComments(result, apiKey);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Analyse: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function enhanceWithAIComments(
  result: AnalysisResult,
  apiKey: string
): Promise<AnalysisResult> {
  const anthropic = new Anthropic({ apiKey });

  // Only enhance top 5 account deviations to save API costs
  const topDeviations = result.by_account.slice(0, 5);

  for (let i = 0; i < topDeviations.length; i++) {
    const dev = topDeviations[i];
    const isExpense = dev.account >= 5000;

    const prompt = `Du bist ein Controlling-Experte. Analysiere diese Abweichung und erstelle einen kurzen, prägnanten Kommentar (max. 3 Sätze) auf Deutsch:

Konto: ${dev.account} - ${dev.account_name}
${result.meta.period_prev}: ${formatCurrency(dev.amount_prev)}
${result.meta.period_curr}: ${formatCurrency(dev.amount_curr)}
Abweichung: ${formatCurrency(dev.delta_abs)} (${dev.delta_pct.toFixed(1)}%)
Typ: ${isExpense ? 'Aufwandskonto' : 'Ertragskonto'}

Top-Buchungen im aktuellen Jahr:
${dev.top_bookings?.map(b => `- ${b.text} (${b.vendor || b.customer || 'k.A.'}): ${formatCurrency(b.amount)}`).join('\n') || 'Keine Details verfügbar'}

Erstelle einen Kommentar der:
1. Die Richtung der Abweichung bewertet (positiv/negativ für das Unternehmen)
2. Mögliche Ursachen basierend auf den Buchungstexten nennt
3. Ggf. einen Hinweis zur weiteren Prüfung gibt`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const aiComment = (response.content[0] as { type: string; text: string }).text;
      result.by_account[i].comment = aiComment;
    } catch (error) {
      console.error('AI comment error for account', dev.account, error);
      // Keep the rule-based comment
    }
  }

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
