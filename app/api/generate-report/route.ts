import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/report-generator';
import { AnalysisResult } from '@/lib/types';
import { getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'export', requestId });
    if (auth instanceof NextResponse) return auth;

    const data: AnalysisResult = await request.json();

    if (!data || !data.meta || !data.by_account) {
      return jsonError('Ungültige Analysedaten', 400, requestId);
    }

    const buffer = await generateReport(data);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Abweichungsanalyse_${data.meta.period_prev}_vs_${data.meta.period_curr}.docx"`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', requestId, sanitizeError(error));
    return jsonError('Fehler bei der Report-Generierung', 500, requestId);
  }
}
