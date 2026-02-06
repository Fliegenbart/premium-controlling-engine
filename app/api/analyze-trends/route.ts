import { NextRequest, NextResponse } from 'next/server';
import { analyzeTrends, prepareTrendPeriod, TrendPeriod, TrendAnalysisResult } from '@/lib/trend-analysis';
import { Booking } from '@/lib/types';
import { parseCSV as parseGenericCSV } from '@/lib/parsers';

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
  try {
    const contentType = request.headers.get('content-type');

    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          error: 'At least 2 period files required for trend analysis',
          hint: 'Upload CSV files for multiple periods (e.g., 2022.csv, 2023.csv, 2024.csv)',
        },
        { status: 400 }
      );
    }

    // Sort files by filename to ensure chronological order
    fileEntries.sort((a, b) => a[0].localeCompare(b[0]));

    // Process each file
    for (const [filename, file] of fileEntries) {
      const text = await file.text();

      // Infer period label from filename
      let periodLabel = filename.replace(/\.csv$/i, '').replace(/_/g, ' ');

      // Try to parse the CSV
      let bookings: Booking[] = [];
      try {
        bookings = parseGenericCSV(text, 'generic_csv');
      } catch (parseError) {
        console.error(`Error parsing ${filename}:`, parseError);
        return NextResponse.json(
          {
            error: `Failed to parse ${filename}`,
            details: parseError instanceof Error ? parseError.message : 'Unknown error',
          },
          { status: 400 }
        );
      }

      if (bookings.length === 0) {
        return NextResponse.json(
          {
            error: `No data found in ${filename}`,
            hint: 'Ensure CSV has proper headers and data rows',
          },
          { status: 400 }
        );
      }

      // Prepare period
      const period = prepareTrendPeriod(periodLabel, bookings);
      periods.push(period);
    }

    // Validate we have at least 2 periods
    if (periods.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 periods required for trend analysis' },
        { status: 400 }
      );
    }

    // Run trend analysis
    const result: TrendAnalysisResult = analyzeTrends(periods);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Trend analysis error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/analyze-trends
 * Handle CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
