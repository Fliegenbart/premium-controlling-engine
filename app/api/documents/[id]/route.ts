/**
 * Document API
 * GET /api/documents/[id] - Get document details
 * DELETE /api/documents/[id] - Delete a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDocument, getDocumentTree, deleteDocument } from '@/lib/doc-index';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error('Get document error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Dokuments' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Dokuments' },
      { status: 500 }
    );
  }
}
