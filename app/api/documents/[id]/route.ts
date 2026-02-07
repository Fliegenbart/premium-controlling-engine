/**
 * Document API
 * GET /api/documents/[id] - Get document details
 * DELETE /api/documents/[id] - Delete a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDocument, getDocumentTree, deleteDocument } from '@/lib/doc-index';
import { enforceRateLimit, getRequestId, jsonError, requireDocumentToken, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const document = getDocument(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Dokument nicht gefunden' },
        { status: 404 }
      );
    }

    // Return document with tree structure (without full content)
    const tree = getDocumentTree(id);

    return NextResponse.json({
      id: document.id,
      filename: document.filename,
      title: document.title,
      description: document.description,
      total_pages: document.total_pages,
      indexed_at: document.indexed_at,
      tree,
    });
  } catch (error) {
    console.error('Get document error:', requestId, sanitizeError(error));
    return jsonError('Fehler beim Laden des Dokuments', 500, requestId);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const rateLimit = enforceRateLimit(request, { limit: 20, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const { id } = await params;
    const deleted = deleteDocument(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Dokument nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', requestId, sanitizeError(error));
    return jsonError('Fehler beim Löschen des Dokuments', 500, requestId);
  }
}
