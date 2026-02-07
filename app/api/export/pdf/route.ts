/**
 * PDF Export API
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateVarianceReport, generateTripleReport } from '@/lib/export-pdf';
import { getRequestId, jsonError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'export', requestId });
    if (auth instanceof NextResponse) return auth;

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
        return jsonError('Unbekannter Export-Typ', 400, requestId);
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'report.pdf'}"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return jsonError('PDF-Export fehlgeschlagen', 500, requestId);
  }
}
