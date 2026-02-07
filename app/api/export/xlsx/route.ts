/**
 * Excel Export API
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportVarianceAnalysis, exportTripleAnalysis } from '@/lib/export-excel';
import { getRequestId, jsonError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'export', requestId });
    if (auth instanceof NextResponse) return auth;

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
        return jsonError('Unbekannter Export-Typ', 400, requestId);
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename || 'export.xlsx'}"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return jsonError('Export fehlgeschlagen', 500, requestId);
  }
}
