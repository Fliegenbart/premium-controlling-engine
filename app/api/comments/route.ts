/**
 * Comments API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createComment,
  updateComment,
  deleteComment,
  getComments,
  getCommentById,
  getCommentThread,
  getCommentStats,
  searchComments
} from '@/lib/comments';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'view', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 60, windowMs: 60_000, keyPrefix: '/api/comments/get' });
    if (rateLimit) return rateLimit;

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType') as 'account' | 'analysis' | 'booking' | 'document' | null;
    const targetId = searchParams.get('targetId');
    const commentId = searchParams.get('commentId');
    const action = searchParams.get('action');
    const query = searchParams.get('query');

    // Search
    if (action === 'search' && query) {
      const results = await searchComments(query, {
        targetType: targetType || undefined,
        limit: 20
      });
      return NextResponse.json({ success: true, results });
    }

    // Get thread
    if (action === 'thread' && commentId) {
      const thread = await getCommentThread(commentId);
      if (!thread) {
        return NextResponse.json({ error: 'Kommentar nicht gefunden' }, { status: 404 });
      }
      return NextResponse.json({ success: true, thread });
    }

    // Get stats
    if (action === 'stats') {
      const stats = await getCommentStats(targetType || undefined, targetId || undefined);
      return NextResponse.json({ success: true, stats });
    }

    // Get comments for target
    if (targetType && targetId) {
      const rawLimit = parseInt(searchParams.get('limit') || '50');
      const rawOffset = parseInt(searchParams.get('offset') || '0');
      const { comments, total } = await getComments(targetType, targetId, {
        includeReplies: searchParams.get('includeReplies') === 'true',
        limit: Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, rawLimit)) : 50,
        offset: Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0
      });
      return NextResponse.json({ success: true, comments, total });
    }

    return jsonError('targetType und targetId erforderlich', 400, requestId);
  } catch (error) {
    console.error('Comments GET error:', requestId, sanitizeError(error));
    return jsonError('Fehler beim Laden der Kommentare', 500, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'comment', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 20, windowMs: 60_000, keyPrefix: '/api/comments/post' });
    if (rateLimit) return rateLimit;
    const user = auth.user;

    const body = await request.json();
    const { targetType, targetId, content, parentId, priority, mentions } = body;

    if (!targetType || !targetId || !content) {
      return jsonError('targetType, targetId und content erforderlich', 400, requestId);
    }
    if (typeof content !== 'string' || content.trim().length === 0 || content.length > 4000) {
      return jsonError('content muss zwischen 1 und 4000 Zeichen enthalten', 400, requestId);
    }

    const comment = await createComment(
      user.id,
      user.name,
      targetType,
      targetId,
      content,
      { parentId, priority, mentions }
    );

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('Comments POST error:', requestId, sanitizeError(error));
    return jsonError('Kommentar konnte nicht erstellt werden', 500, requestId);
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'comment', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 20, windowMs: 60_000, keyPrefix: '/api/comments/put' });
    if (rateLimit) return rateLimit;
    const user = auth.user;

    const body = await request.json();
    const { commentId, content, status, priority } = body;

    if (!commentId) {
      return jsonError('commentId erforderlich', 400, requestId);
    }

    const existing = await getCommentById(commentId);
    if (!existing) {
      return jsonError('Kommentar nicht gefunden', 404, requestId);
    }
    if (existing.userId !== user.id) {
      return jsonError('Keine Berechtigung für diesen Kommentar', 403, requestId);
    }
    if (typeof content === 'string' && content.length > 4000) {
      return jsonError('content darf maximal 4000 Zeichen enthalten', 400, requestId);
    }

    const updated = await updateComment(commentId, { content, status, priority });
    if (!updated) {
      return jsonError('Kommentar nicht gefunden', 404, requestId);
    }

    return NextResponse.json({ success: true, comment: updated });
  } catch (error) {
    console.error('Comments PUT error:', requestId, sanitizeError(error));
    return jsonError('Kommentar konnte nicht aktualisiert werden', 500, requestId);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'comment', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 20, windowMs: 60_000, keyPrefix: '/api/comments/delete' });
    if (rateLimit) return rateLimit;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return jsonError('commentId erforderlich', 400, requestId);
    }

    const existing = await getCommentById(commentId);
    if (!existing) {
      return jsonError('Kommentar nicht gefunden', 404, requestId);
    }
    if (existing.userId !== user.id) {
      return jsonError('Keine Berechtigung für diesen Kommentar', 403, requestId);
    }

    const deleted = await deleteComment(commentId);
    if (!deleted) {
      return jsonError('Kommentar nicht gefunden', 404, requestId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Comments DELETE error:', requestId, sanitizeError(error));
    return jsonError('Kommentar konnte nicht gelöscht werden', 500, requestId);
  }
}
