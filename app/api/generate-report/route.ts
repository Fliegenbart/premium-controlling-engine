import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/report-generator';
import { AnalysisResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const data: AnalysisResult = await request.json();

    if (!data || !data.meta || !data.by_account) {
      return NextResponse.json(
        { error: 'Ungültige Analysedaten' },
        { status: 400 }
      );
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
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Report-Generierung: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
