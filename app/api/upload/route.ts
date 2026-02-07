/**
 * Upload API - Ingest CSV/XLSX into DuckDB
 * POST /api/upload
 * 
 * Handles:
 * - File parsing (CSV, XLSX, SAP exports)
 * - Schema inference
 * - Data profiling
 * - DuckDB table creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadBookings, initDatabase, exportToParquet } from '@/lib/duckdb-engine';
import { parseCSV, parseXLSX, detectFormat } from '@/lib/parsers';
import { Booking } from '@/lib/types';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError, validateUploadFile } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'upload', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000, keyPrefix: '/api/upload' });
    if (rateLimit) return rateLimit;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const period = formData.get('period') as 'prev' | 'curr';

    const fileError = validateUploadFile(file, {
      maxBytes: 25 * 1024 * 1024,
      allowedExtensions: ['.csv', '.xls', '.xlsx'],
      label: 'Upload-Datei',
    });
    if (fileError) {
      return jsonError(fileError, 400, requestId);
    }

    if (!period || !['prev', 'curr'].includes(period)) {
      return jsonError('Period muss "prev" oder "curr" sein', 400, requestId);
    }

    // Initialize DuckDB
    await initDatabase(process.env.DATABASE_PATH);

    // Detect file format and parse with confidence scoring
    const lowerName = file.name.toLowerCase();
    let bookings: Booking[];
    let detection: { format: string; confidence: number };

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      bookings = await parseXLSX(Buffer.from(buffer));
      detection = { format: 'excel', confidence: 1 };
    } else {
      const content = await file.text();
      const detected = detectFormat(content, file.name);
      detection = {
        format: detected.format,
        confidence: detected.confidence,
      };
      bookings = parseCSV(content, detected.format);
    }
    
    if (bookings.length === 0) {
      return jsonError('Keine gültigen Buchungen gefunden. Bitte Format prüfen.', 400, requestId);
    }
    
    // Load into DuckDB
    const fullTableName = `bookings_${period}`;
    const { rowCount, profile } = await loadBookings(bookings, fullTableName);
    
    // Export to Parquet for persistence
    const parquetPath = `/data/${fullTableName}_${Date.now()}.parquet`;
    try {
      await exportToParquet(`controlling.${fullTableName}`, parquetPath);
    } catch (e) {
      // Non-critical - continue without parquet export
      console.warn('Parquet export failed:', e);
    }
    
    return NextResponse.json({
      success: true,
      tableName: `controlling.${fullTableName}`,
      profile,
      rowCount,
      detection
    });

  } catch (error) {
    console.error('Upload error:', requestId, sanitizeError(error));
    return jsonError('Upload fehlgeschlagen', 500, requestId);
  }
}

// App Router handles body parsing automatically - no config needed
