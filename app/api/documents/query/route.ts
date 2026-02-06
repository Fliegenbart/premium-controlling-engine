/**
 * Document Query API - Search documents
 * POST /api/documents/query
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchAllDocuments } from '@/lib/doc-index/document-store';

interface SearchResultItem {
  documentId: string;
  documentTitle: string;
  node: { title?: string };
  excerpt: string;
  relevanceScore: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, limit = 10 } = body;

    if (!question) {
      return NextResponse.json({ error: 'Frage fehlt' }, { status: 400 });
    }

    const results = searchAllDocuments(question);

    return NextResponse.json({
      success: true,
      query: question,
      results: results.slice(0, limit).map((r: SearchResultItem) => ({
        documentId: r.documentId,
        documentTitle: r.documentTitle,
        nodeTitle: r.node?.title || '',
        excerpt: r.excerpt,
        relevance: r.relevanceScore,
      })),
    });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      { error: `Anfrage fehlgeschlagen: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// GET - Simple search endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Suchbegriff fehlt (?q=...)' }, { status: 400 });
  }

  const results = searchAllDocuments(q);

  return NextResponse.json({
    success: true,
    query: q,
    results: results.slice(0, 10).map((r: SearchResultItem) => ({
      documentId: r.documentId,
      documentTitle: r.documentTitle,
      nodeTitle: r.node?.title || '',
      excerpt: r.excerpt,
      relevance: r.relevanceScore,
    })),
  });
}
