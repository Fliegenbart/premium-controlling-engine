/**
 * Documents API - Upload and list documents
 * GET/POST /api/documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { parsePDF } from '@/lib/doc-index/pdf-parser';
import {
  addDocument,
  getAllDocuments,
  getStats,
} from '@/lib/doc-index/document-store';

// GET - List all documents
export async function GET() {
  try {
    const documents = getAllDocuments();
    const stats = getStats();

    return NextResponse.json({
      success: true,
      documents: documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        title: d.title,
        type: d.type,
        totalPages: d.totalPages,
        totalSections: d.totalSections,
        indexedAt: d.indexedAt,
        sizeBytes: d.sizeBytes,
      })),
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Fehler beim Laden: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// POST - Upload and index document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    const filename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());

    let indexedDoc;

    if (filename.toLowerCase().endsWith('.pdf')) {
      indexedDoc = await parsePDF(buffer, filename);
    } else {
      return NextResponse.json(
        { error: 'Nur PDF-Dateien werden unterstützt' },
        { status: 400 }
      );
    }

    addDocument(indexedDoc);

    return NextResponse.json({
      success: true,
      document: {
        id: indexedDoc.id,
        filename: indexedDoc.filename,
        title: indexedDoc.title,
        totalPages: indexedDoc.totalPages,
        totalSections: indexedDoc.totalSections,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: `Upload fehlgeschlagen: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
