/**
 * Documents API
 * GET /api/documents - List all documents
 * POST /api/documents - Upload and index a new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { indexDocument, listDocuments } from '@/lib/doc-index';

export async function GET() {
  try {
    const documents = listDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Dokumente' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Nur PDF-Dateien werden unterstützt' },
        { status: 400 }
      );
    }

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Datei zu groß (max. 20MB)' },
        { status: 400 }
      );
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Index the document
    const document = await indexDocument(buffer, file.name);

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        title: document.title,
        total_pages: document.total_pages,
        indexed_at: document.indexed_at,
        sections: document.tree.children.map(c => ({
          title: c.title,
          pages: `${c.page_start}-${c.page_end}`,
        })),
      },
    });
  } catch (error) {
    console.error('Index document error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Indexieren des Dokuments: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
