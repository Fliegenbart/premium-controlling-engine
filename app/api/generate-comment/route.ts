import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AccountDeviation, TopBooking } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

function formatBookingsList(bookings: TopBooking[], label: string): string {
  if (!bookings || bookings.length === 0) return `${label}: Keine Buchungen`;

  const items = bookings.slice(0, 5).map(b => {
    const entity = b.vendor || b.customer || '';
    return `- ${b.document_no}: ${b.text}${entity ? ` (${entity})` : ''} → ${formatCurrency(b.amount)}`;
  });

  return `${label}:\n${items.join('\n')}`;
}

export async function POST(request: NextRequest) {
  try {
    const { deviation, apiKey } = await request.json();

    if (!deviation) {
      return NextResponse.json(
        { error: 'Abweichungsdaten erforderlich' },
        { status: 400 }
      );
    }

    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return NextResponse.json(
        { error: 'API-Schlüssel erforderlich' },
        { status: 400 }
      );
    }

    const dev = deviation as AccountDeviation;
    const anthropic = new Anthropic({ apiKey });

    const isExpense = dev.account >= 5000;
    const accountType = isExpense ? 'Aufwandskonto' : 'Erlöskonto';

    const prompt = `Du bist ein erfahrener Controller bei einem Labordiagnostik-Unternehmen.
Analysiere diese Kostenabweichung und erstelle einen prüfungssicheren Kommentar.

KONTODETAILS:
- Konto: ${dev.account} - ${dev.account_name}
- Typ: ${accountType}
- Vorjahr: ${formatCurrency(dev.amount_prev)} (${dev.bookings_count_prev || '?'} Buchungen)
- Aktuell: ${formatCurrency(dev.amount_curr)} (${dev.bookings_count_curr || '?'} Buchungen)
- Abweichung: ${formatCurrency(dev.delta_abs)} (${dev.delta_pct >= 0 ? '+' : ''}${dev.delta_pct.toFixed(1)}%)

${formatBookingsList(dev.top_bookings_curr || dev.top_bookings || [], 'TOP BUCHUNGEN AKTUELL')}

${formatBookingsList(dev.top_bookings_prev || [], 'TOP BUCHUNGEN VORJAHR')}

${formatBookingsList(dev.new_bookings || [], 'NEUE BUCHUNGEN (im VJ nicht vorhanden)')}

${formatBookingsList(dev.missing_bookings || [], 'WEGGEFALLENE BUCHUNGEN (im AJ nicht mehr vorhanden)')}

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

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const comment = (response.content[0] as { type: string; text: string }).text;

    return NextResponse.json({
      comment,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Comment generation error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Kommentar-Generierung: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
