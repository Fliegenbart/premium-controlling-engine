/**
 * PDF Export API
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateVarianceReport, generateTripleReport } from '@/lib/export-pdf';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, options, filename } = body;

    let buffer: Buffer;

    switch (type) {
      case 'variance':
        buffer = await generateVarianceReport(data, options);
        break;
      case 'triple':
        buffer = await generateTripleReport(data, options);
        break;
      default:
        return NextResponse.json({ error: 'Unbekannter Export-Typ' }, { status: 400 });
    }

    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="${filename || 'report.pdf'}"`);

    return response;
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'PDF-Export fehlgeschlagen', details: (error as Error).message },
      { status: 500 }
    );
  }
}
