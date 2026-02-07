/**
 * Document Query API - Search documents
 * POST /api/documents/query
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchAllDocuments } from '@/lib/doc-index/document-store';
import { documentsSearchSchema } from '@/lib/validation';
import { enforceRateLimit, getRequestId, jsonError, requireDocumentToken, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

type SearchResultItem = ReturnType<typeof searchAllDocuments>[number];

export async function POST(request: NextRequest) {
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

    const rateLimit = enforceRateLimit(request, { limit: 30, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const parsed = documentsSearchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Ungültige Anfrage', 400, requestId);
    }
    const { question, limit = 10 } = parsed.data;

    const results = searchAllDocuments(question);

    return NextResponse.json({
      success: true,
      query: question,
      results: results.slice(0, limit).map((r: SearchResultItem) => ({
        documentId: r.documentId,
        documentTitle: r.documentTitle,
        nodeTitle: r.node?.title || '',
        excerpt: r.node?.summary || r.node?.content?.substring(0, 200) || '',
        relevance: r.score,
      })),
    });
  } catch (error) {
    console.error('Query error:', requestId, sanitizeError(error));
    return jsonError('Anfrage fehlgeschlagen.', 500, requestId);
  }
}

// GET - Simple search endpoint
export async function GET(request: NextRequest) {
  const requestId = getRequestId();
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

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
      return jsonError('Suchbegriff fehlt (?q=...)', 400, requestId);
    }

    const results = searchAllDocuments(q);

    return NextResponse.json({
      success: true,
      query: q,
      results: results.slice(0, 10).map((r: SearchResultItem) => ({
        documentId: r.documentId,
        documentTitle: r.documentTitle,
        nodeTitle: r.node?.title || '',
        excerpt: r.node?.summary || r.node?.content?.substring(0, 200) || '',
        relevance: r.score,
      })),
    });
  } catch (error) {
    console.error('Query error:', requestId, sanitizeError(error));
    return jsonError('Anfrage fehlgeschlagen.', 500, requestId);
  }
}
