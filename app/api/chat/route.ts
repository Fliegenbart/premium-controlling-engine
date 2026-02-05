import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult, ChatMessage, AccountDeviation } from '@/lib/types';
import { getKnowledgeService } from '@/lib/rag/knowledge-service';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

// Extract mentioned accounts from user message
function findRelevantAccounts(message: string, accounts: AccountDeviation[]): AccountDeviation[] {
  const msgLower = message.toLowerCase();

  // Keywords to account categories
  const keywords: Record<string, number[]> = {
    'personal': [6000, 6010, 6020, 6100],
    'gehalt': [6000, 6010, 6020],
    'lohn': [6000, 6020],
    'material': [5000, 5100],
    'reagenz': [5100],
    'fremd': [5900],
    'miete': [6300],
    'raum': [6300],
    'reise': [6700],
    'it': [6815],
    'edv': [6815],
    'software': [6815],
    'beratung': [6820],
    'rechts': [6820],
    'umsatz': [4000, 4400],
    'erlös': [4000, 4400],
    'labor': [4400, 5100],
    'versicherung': [6400],
    'reparatur': [6500],
    'wartung': [6500],
    'abschreibung': [6200],
    'zins': [7000],
  };

  const matchedAccountNumbers = new Set<number>();

  // Check keywords
  for (const [keyword, accountNums] of Object.entries(keywords)) {
    if (msgLower.includes(keyword)) {
      accountNums.forEach(n => matchedAccountNumbers.add(n));
    }
  }

  // Check for "größte" or "wichtigste" or "top" -> return top 5
  if (msgLower.includes('größt') || msgLower.includes('wichtigst') || msgLower.includes('top') || msgLower.includes('haupt')) {
    return accounts.slice(0, 5);
  }

  // Check for "alle" or "übersicht" -> return top 10
  if (msgLower.includes('alle') || msgLower.includes('übersicht') || msgLower.includes('gesamt')) {
    return accounts.slice(0, 10);
  }

  // Filter accounts by matched numbers
  if (matchedAccountNumbers.size > 0) {
    return accounts.filter(a => {
      const accountPrefix = Math.floor(a.account / 100) * 100;
      return matchedAccountNumbers.has(a.account) || matchedAccountNumbers.has(accountPrefix);
    });
  }

  // Default: return accounts mentioned by delta or top 3
  return accounts.slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const { message, context, history, apiKey } = await request.json();

    if (!message || !context) {
      return NextResponse.json(
        { error: 'Nachricht und Kontext erforderlich' },
        { status: 400 }
      );
    }

    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return NextResponse.json(
        { error: 'API-Schlüssel erforderlich für Chat-Funktion. Bitte in den Einstellungen hinzufügen.' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const knowledge = getKnowledgeService();

    // Build context summary
    const analysisContext = context as AnalysisResult;

    // Find relevant accounts based on user question
    const relevantAccounts = findRelevantAccounts(message, analysisContext.by_account);

    // Build detailed account info with bookings
    const accountDetails = relevantAccounts.map(d => {
      const ragContext = knowledge.getAccountKnowledge(d.account);
      const bookingsInfo = d.top_bookings_curr?.slice(0, 5).map(b =>
        `    • ${b.date}: "${b.text}" (Beleg: ${b.document_no}) = ${formatCurrency(b.amount)}`
      ).join('\n') || '    (keine Details)';

      const newBookingsInfo = d.new_bookings?.slice(0, 3).map(b =>
        `    • NEU: "${b.text}" (Beleg: ${b.document_no}) = ${formatCurrency(b.amount)}`
      ).join('\n') || '';

      return `
📊 KONTO ${d.account} - ${d.account_name}
   Vorjahr: ${formatCurrency(d.amount_prev)} | Aktuell: ${formatCurrency(d.amount_curr)}
   Abweichung: ${formatCurrency(d.delta_abs)} (${d.delta_pct >= 0 ? '+' : ''}${d.delta_pct.toFixed(1)}%)
   Buchungen: ${d.bookings_count_prev || '?'} → ${d.bookings_count_curr || '?'}
   ${ragContext ? `Typisch: ${ragContext.typical_behavior}` : ''}

   Top Buchungen aktuell:
${bookingsInfo}
${newBookingsInfo ? `\n   Neue Buchungsarten:\n${newBookingsInfo}` : ''}`;
    }).join('\n');

    const topAccounts = analysisContext.by_account
      .slice(0, 10)
      .map(
        (d) =>
          `- ${d.account} ${d.account_name}: ${formatCurrency(d.delta_abs)} (${d.delta_pct >= 0 ? '+' : ''}${d.delta_pct.toFixed(1)}%)`
      )
      .join('\n');

    const costCenters = analysisContext.by_cost_center
      ?.slice(0, 5)
      .map(
        (cc) =>
          `- ${cc.cost_center || '(keine)'}: Abweichung ${formatCurrency(cc.delta_abs)}`
      )
      .join('\n');

    const systemPrompt = `Du bist ein erfahrener Controlling-Experte bei einem Labordiagnostik-Unternehmen.
Du beantwortest Fragen zu Abweichungsanalysen präzise und mit konkreten Zahlen.

WICHTIG: Nenne IMMER konkrete Belegnummern wenn du Buchungen erwähnst!

ANALYSEDATEN:
Zeitraum: ${analysisContext.meta.period_prev} vs. ${analysisContext.meta.period_curr}
Gesamtabweichung: ${formatCurrency(analysisContext.summary.total_delta)}
Erlöse: ${formatCurrency(analysisContext.summary.erloese_prev)} → ${formatCurrency(analysisContext.summary.erloese_curr)}
Aufwendungen: ${formatCurrency(analysisContext.summary.aufwendungen_prev)} → ${formatCurrency(analysisContext.summary.aufwendungen_curr)}

ÜBERSICHT ALLER ABWEICHUNGEN:
${topAccounts}

${costCenters ? `KOSTENSTELLEN:\n${costCenters}` : ''}

DETAILS ZU RELEVANTEN KONTEN:
${accountDetails}

ANTWORT-REGELN:
1. Antworte auf Deutsch, professionell aber verständlich
2. Nenne KONKRETE Belegnummern (z.B. "Beleg 4711")
3. Nenne konkrete Euro-Beträge
4. Erkläre die URSACHE der Abweichung basierend auf den Buchungstexten
5. Gib eine Einschätzung: [Erwartbar/Prüfenswert/Kritisch]
6. Halte Antworten fokussiert (3-5 Sätze)`;

    // Convert history to Anthropic format (limit to last 10 messages)
    const recentHistory = (history as ChatMessage[])
      .filter((m) => !m.isLoading)
      .slice(-10)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...recentHistory,
        { role: 'user', content: message },
      ],
    });

    const responseText = (response.content[0] as { type: string; text: string }).text;

    return NextResponse.json({
      response: responseText,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Antwortgenerierung: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
