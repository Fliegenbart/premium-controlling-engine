/**
 * Document Query API - Ask questions about documents
 * POST /api/documents/query
 */

import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/doc-index/tree-reasoner';
import { searchDocuments } from '@/lib/doc-index/document-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, useOllama = true, ollamaModel, anthropicApiKey } = body;

    if (!question) {
      return NextResponse.json({ error: 'Frage fehlt' }, { status: 400 });
    }

    const result = await answerQuestion(question, {
      useOllama,
      ollamaModel,
      anthropicApiKey,
    });

    return NextResponse.json({
      success: true,
      ...result,
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

  const results = searchDocuments(q, 10);

  return NextResponse.json({
    success: true,
    query: q,
    results: results.map((r) => ({
      documentId: r.documentId,
      documentTitle: r.documentTitle,
      nodeTitle: r.node.title,
      path: r.path,
      excerpt: r.excerpt,
      relevance: r.relevanceScore,
    })),
  });
}
