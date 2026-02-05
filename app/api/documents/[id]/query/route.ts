/**
 * Document Query API
 * POST /api/documents/[id]/query - Search within a document using reasoning
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDocument, searchDocument, quickSearch } from '@/lib/doc-index';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { query, apiKey, quick } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Frage ist erforderlich' },
        { status: 400 }
      );
    }

    const document = getDocument(id);
    if (!document) {
      return NextResponse.json(
        { error: 'Dokument nicht gefunden' },
        { status: 404 }
      );
    }

    // Quick search (no LLM, just keyword matching)
    if (quick) {
      const results = quickSearch(document, query);
      return NextResponse.json({
        quick: true,
        results: results.map(r => ({
          title: r.node.title,
          page: r.node.page_start,
          summary: r.node.summary,
          score: r.score,
        })),
      });
    }

    // Full reasoning search (requires API key)
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: 'API-Key erforderlich für intelligente Suche' },
        { status: 400 }
      );
    }

    const result = await searchDocument(document, query, key);

    return NextResponse.json({
      query: result.query,
      answer: result.answer,
      confidence: result.confidence,
      references: result.references.map(ref => ({
        title: ref.title,
        page: ref.page,
        section_path: ref.section_path,
        excerpt: ref.excerpt,
      })),
      reasoning_trace: result.reasoning_trace,
    });
  } catch (error) {
    console.error('Document query error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Suche: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
