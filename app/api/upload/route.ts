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
import { Booking, UploadResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse | { error: string }>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const period = formData.get('period') as 'prev' | 'curr';
    const tableName = formData.get('tableName') as string || `bookings_${period}`;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }
    
    if (!period || !['prev', 'curr'].includes(period)) {
      return NextResponse.json(
        { error: 'Period muss "prev" oder "curr" sein' },
        { status: 400 }
      );
    }
    
    // Initialize DuckDB
    await initDatabase(process.env.DATABASE_PATH);
    
    // Detect file format and parse with confidence scoring
    const content = await file.text();
    const detection = detectFormat(content, file.name);

    let bookings: Booking[];

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      bookings = await parseXLSX(Buffer.from(buffer));
    } else {
      bookings = parseCSV(content, detection.format);
    }
    
    if (bookings.length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Buchungen gefunden. Bitte Format prüfen.' },
        { status: 400 }
      );
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
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Upload fehlgeschlagen: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// App Router handles body parsing automatically - no config needed
