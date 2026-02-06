/**
 * Documents API
 * GET /api/documents - List all documents
 * POST /api/documents - Upload and index a new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { indexDocument, listDocuments } from '@/lib/doc-index';
import { enforceRateLimit, getRequestId, jsonError, requireDocumentToken, sanitizeError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const tokenError = requireDocumentToken(request);
    if (tokenError) return tokenError;

    const rateLimit = enforceRateLimit(request, { limit: 60, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const documents = listDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('List documents error:', requestId, sanitizeError(error));
    return jsonError('Fehler beim Laden der Dokumente', 500, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const tokenError = requireDocumentToken(request);
    if (tokenError) return tokenError;

    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

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
    console.error('Index document error:', requestId, sanitizeError(error));
    return jsonError('Fehler beim Indexieren des Dokuments.', 500, requestId);
  }
}
