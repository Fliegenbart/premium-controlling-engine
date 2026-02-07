/**
 * Documents API
 * GET /api/documents - List all documents
 * POST /api/documents - Upload and index a new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { indexDocument, listDocuments } from '@/lib/doc-index';
import { enforceRateLimit, getRequestId, jsonError, requireDocumentToken, sanitizeError, validateUploadFile } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'view', requestId });
    if (auth instanceof NextResponse) {
      if (process.env.DOCUMENT_ACCESS_TOKEN) {
        const tokenError = requireDocumentToken(request);
        if (tokenError) return tokenError;
      } else {
        return auth;
      }
    }

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
    const auth = await requireSessionUser(request, { permission: 'upload', requestId });
    if (auth instanceof NextResponse) {
      if (process.env.DOCUMENT_ACCESS_TOKEN) {
        const tokenError = requireDocumentToken(request);
        if (tokenError) return tokenError;
      } else {
        return auth;
      }
    }

    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    const fileError = validateUploadFile(file, {
      maxBytes: 20 * 1024 * 1024,
      allowedExtensions: ['.pdf'],
      label: 'Dokument',
    });
    if (fileError) {
      return jsonError(fileError, 400, requestId);
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
