/**
 * Document Query API
 * POST /api/documents/[id]/query - Search within a document using reasoning
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDocument, searchDocument, quickSearch } from '@/lib/doc-index';
import { documentQuerySchema } from '@/lib/validation';
import { enforceRateLimit, getRequestId, jsonError, requireDocumentToken, sanitizeError } from '@/lib/api-helpers';
import { getHybridLLMService } from '@/lib/llm/hybrid-service';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(
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

    const rateLimit = enforceRateLimit(request, { limit: 20, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const { id } = await params;
    const body = await request.json();
    const parsed = documentQuerySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Ungültige Anfrage', 400, requestId);
    }
    const { query, quick } = parsed.data;

    if (!query || typeof query !== 'string') {
      return jsonError('Frage ist erforderlich', 400, requestId);
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

    // Full reasoning search (requires LLM)
    const llm = getHybridLLMService();
    const status = await llm.getStatus();
    if (status.activeProvider === 'none') {
      return jsonError('Kein LLM verfügbar. Bitte Ollama starten.', 503, requestId);
    }

    const result = await searchDocument(document, query);

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
    console.error('Document query error:', requestId, sanitizeError(error));
    return jsonError('Fehler bei der Suche.', 500, requestId);
  }
}
