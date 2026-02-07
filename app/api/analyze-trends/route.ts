import { NextRequest, NextResponse } from 'next/server';
import { analyzeTrends, prepareTrendPeriod, TrendPeriod, TrendAnalysisResult } from '@/lib/trend-analysis';
import { Booking } from '@/lib/types';
import { parseCSV as parseGenericCSV } from '@/lib/parsers';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError, validateUploadFile } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

/**
 * POST /api/analyze-trends
 *
 * Accepts multipart form data with multiple CSV files for different periods
 * Each file should be named with a period label (e.g., "2022.csv", "2023.csv", "Q1_2024.csv")
 *
 * Request:
 * - FormData with files:
 *   - "2022.csv": CSV file with 2022 data
 *   - "2023.csv": CSV file with 2023 data
 *   - etc.
 *
 * Response:
 * - TrendAnalysisResult with multi-period trend analysis
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 8, windowMs: 60_000, keyPrefix: '/api/analyze-trends' });
    if (rateLimit) return rateLimit;

    const contentType = request.headers.get('content-type');

    if (!contentType?.includes('multipart/form-data')) {
      return jsonError('Content-Type must be multipart/form-data', 400, requestId);
    }

    const formData = await request.formData();

    // Extract files from form data
    const periods: TrendPeriod[] = [];
    const fileEntries: Array<[string, File]> = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        fileEntries.push([key, value]);
      }
    }

    if (fileEntries.length < 2) {
      return jsonError('At least 2 period files required for trend analysis', 400, requestId);
    }

    if (fileEntries.length > 12) {
      return jsonError('Maximal 12 Perioden pro Anfrage erlaubt', 400, requestId);
    }

    // Sort files by filename to ensure chronological order
    fileEntries.sort((a, b) => a[0].localeCompare(b[0]));

    // Process each file
    for (const [filename, file] of fileEntries) {
      const fileError = validateUploadFile(file, {
        maxBytes: 20 * 1024 * 1024,
        allowedExtensions: ['.csv'],
        label: `Perioden-Datei ${filename}`,
      });
      if (fileError) {
        return jsonError(fileError, 400, requestId);
      }

      const text = await file.text();

      // Infer period label from filename
      let periodLabel = filename.replace(/\.csv$/i, '').replace(/_/g, ' ');

      // Try to parse the CSV
      let bookings: Booking[] = [];
      try {
        bookings = parseGenericCSV(text, 'generic_csv');
      } catch (parseError) {
        console.error(`Error parsing ${filename}:`, requestId, sanitizeError(parseError));
        return jsonError(`Failed to parse ${filename}`, 400, requestId);
      }

      if (bookings.length === 0) {
        return jsonError(`No data found in ${filename}`, 400, requestId);
      }

      // Prepare period
      const period = prepareTrendPeriod(periodLabel, bookings);
      periods.push(period);
    }

    // Validate we have at least 2 periods
    if (periods.length < 2) {
      return jsonError('At least 2 periods required for trend analysis', 400, requestId);
    }

    // Run trend analysis
    const result: TrendAnalysisResult = analyzeTrends(periods);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Trend analysis error:', requestId, sanitizeError(error));
    return jsonError('Internal server error', 500, requestId);
  }
}
