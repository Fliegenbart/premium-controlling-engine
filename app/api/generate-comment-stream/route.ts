import { NextRequest, NextResponse } from 'next/server';
import { AccountDeviation, TopBooking } from '@/lib/types';
import { getHybridLLMService } from '@/lib/llm/hybrid-service';
import { getKnowledgeService } from '@/lib/rag/knowledge-service';
import { INJECTION_GUARD, sanitizeForPrompt, wrapUntrusted } from '@/lib/prompt-utils';
import { generateCommentSchema } from '@/lib/validation';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

function formatBookingsList(bookings: TopBooking[], label: string): string {
  if (!bookings || bookings.length === 0) return `${label}: Keine Buchungen`;

  const items = bookings.slice(0, 5).map(b => {
    const entity = sanitizeForPrompt(b.vendor || b.customer || '', 60);
    const docNo = sanitizeForPrompt(b.document_no || '', 40);
    const text = sanitizeForPrompt(b.text || '', 140);
    return `- ${docNo}: ${text}${entity ? ` (${entity})` : ''} → ${formatCurrency(b.amount)}`;
  });

  return `${label}:\n${items.join('\n')}`;
}

function sendSSEEvent(data: {text: string; done: boolean}): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const rateLimit = enforceRateLimit(request, { limit: 20, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const parsed = generateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Ungültige Abweichungsdaten', 400, requestId);
    }
    const deviation = parsed.data.deviation;

    if (!deviation) {
      return jsonError('Abweichungsdaten erforderlich', 400, requestId);
    }

    const dev = deviation as AccountDeviation;
    const llm = getHybridLLMService();
    const status = await llm.getStatus();
    if (status.activeProvider === 'none') {
      return jsonError('Kein LLM verfügbar. Bitte Ollama starten.', 503, requestId);
    }

    const knowledge = getKnowledgeService();
    const ragContext = knowledge.getAccountKnowledge(dev.account);

    const isExpense = dev.account >= 5000;
    const accountType = isExpense ? 'Aufwandskonto' : 'Erlöskonto';

    const prompt = `Du bist ein erfahrener Controller in einem mittelständischen Unternehmen.
Analysiere diese Kostenabweichung und erstelle einen prüfungssicheren Kommentar.
${INJECTION_GUARD}

KONTODETAILS:
- Konto: ${dev.account} - ${sanitizeForPrompt(dev.account_name, 120)}
- Typ: ${accountType}
- Vorjahr: ${formatCurrency(dev.amount_prev)} (${dev.bookings_count_prev || '?'} Buchungen)
- Aktuell: ${formatCurrency(dev.amount_curr)} (${dev.bookings_count_curr || '?'} Buchungen)
- Abweichung: ${formatCurrency(dev.delta_abs)} (${dev.delta_pct >= 0 ? '+' : ''}${dev.delta_pct.toFixed(1)}%)

${ragContext ? `HISTORISCHES VERHALTEN:
${sanitizeForPrompt(ragContext.typical_behavior, 500)}` : ''}

${wrapUntrusted('TOP BUCHUNGEN AKTUELL', formatBookingsList(dev.top_bookings_curr || dev.top_bookings || [], 'TOP BUCHUNGEN AKTUELL'), 1600)}

${wrapUntrusted('TOP BUCHUNGEN VORJAHR', formatBookingsList(dev.top_bookings_prev || [], 'TOP BUCHUNGEN VORJAHR'), 1600)}

${wrapUntrusted('NEUE BUCHUNGEN', formatBookingsList(dev.new_bookings || [], 'NEUE BUCHUNGEN (im VJ nicht vorhanden)'), 1600)}

${wrapUntrusted('WEGGEFALLENE BUCHUNGEN', formatBookingsList(dev.missing_bookings || [], 'WEGGEFALLENE BUCHUNGEN (im AJ nicht mehr vorhanden)'), 1600)}

Erstelle einen strukturierten Kommentar mit:

1. ZUSAMMENFASSUNG (1 Satz mit der Kernaussage)

2. HAUPTTREIBER (Bullet Points mit konkreten Belegnummern)
   - Benenne die wichtigsten Ursachen der Abweichung
   - Referenziere mindestens 2-3 konkrete Belegnummern
   - Nenne Beträge

3. EMPFEHLUNG (1-2 Sätze)
   - Handlungsempfehlung für das Management
   - Prüfungshinweise falls relevant

Schreibe sachlich und präzise auf Deutsch. Referenziere konkrete Belegnummern aus den Daten oben.`;

    // Create SSE response with streaming
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of llm.generateStream(prompt, {
            maxTokens: 600,
            temperature: 0.3,
          })) {
            const event = sendSSEEvent({
              text: chunk.text,
              done: chunk.done,
            });
            controller.enqueue(encoder.encode(event));
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', requestId, sanitizeError(error));
          const errorEvent = sendSSEEvent({
            text: `[ERROR] ${(error as Error).message}`,
            done: true,
          });
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Comment stream error:', requestId, sanitizeError(error));
    return jsonError('Fehler bei der Streaming-Kommentar-Generierung.', 500, requestId);
  }
}
