/**
 * Excel Export API
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportVarianceAnalysis, exportTripleAnalysis } from '@/lib/export-excel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, filename } = body;

    let buffer: Buffer;

    switch (type) {
      case 'variance':
        buffer = await exportVarianceAnalysis(data);
        break;
      case 'triple':
        buffer = await exportTripleAnalysis(data);
        break;
      default:
        return NextResponse.json({ error: 'Unbekannter Export-Typ' }, { status: 400 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename || 'export.xlsx'}"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { error: 'Export fehlgeschlagen', details: (error as Error).message },
      { status: 500 }
    );
  }
}
