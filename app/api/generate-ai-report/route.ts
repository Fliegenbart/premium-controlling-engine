/**
 * Generate AI-Enhanced Monthly Report API
 * POST /api/generate-ai-report
 *
 * Generates a professional Word document with AI-powered narrative sections
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAIReportSections } from '@/lib/ai-report-generator';
import { generateEnhancedReport } from '@/lib/enhanced-report-generator';
import { AnalysisResult } from '@/lib/types';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'export', requestId });
    if (auth instanceof NextResponse) return auth;

    // Rate limiting
    const rateLimit = enforceRateLimit(request, { limit: 5, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const { data, includeAI = true } = body as {
      data: AnalysisResult;
      includeAI?: boolean;
    };

    // Validate input
    if (!data || typeof data !== 'object') {
      return jsonError('Analysedaten erforderlich', 400, requestId);
    }

    if (!data.meta || !data.summary || !Array.isArray(data.by_account)) {
      return jsonError('Ungültige Datenstruktur', 400, requestId);
    }

    // Generate AI sections (always, but may fall back to templates)
    const aiSections = await generateAIReportSections(data);

    // Generate enhanced report
    const docBuffer = await generateEnhancedReport(data, aiSections);

    // Return as downloadable file
    return new NextResponse(docBuffer as unknown as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Monatsbericht_${data.meta.period_curr}.docx"`,
        'Content-Length': docBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('AI Report generation error:', requestId, sanitizeError(error));
    return jsonError('Report-Generierung fehlgeschlagen', 500, requestId);
  }
}
