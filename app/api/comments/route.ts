/**
 * Comments API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createComment,
  updateComment,
  deleteComment,
  getComments,
  getCommentThread,
  getCommentStats,
  searchComments
} from '@/lib/comments';
import { validateSession } from '@/lib/auth';

async function getUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const session = await validateSession(token);
  return session.valid ? session.user : null;
}

export async function GET(request: NextRequest) {
  try {
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
      const { comments, total } = await getComments(targetType, targetId, {
        includeReplies: searchParams.get('includeReplies') === 'true',
        limit: parseInt(searchParams.get('limit') || '50'),
        offset: parseInt(searchParams.get('offset') || '0')
      });
      return NextResponse.json({ success: true, comments, total });
    }

    return NextResponse.json({ error: 'targetType und targetId erforderlich' }, { status: 400 });
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Kommentare' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId, content, parentId, priority, mentions } = body;

    if (!targetType || !targetId || !content) {
      return NextResponse.json(
        { error: 'targetType, targetId und content erforderlich' },
        { status: 400 }
      );
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
    console.error('Comments POST error:', error);
    return NextResponse.json({ error: 'Kommentar konnte nicht erstellt werden' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const body = await request.json();
    const { commentId, content, status, priority } = body;

    if (!commentId) {
      return NextResponse.json({ error: 'commentId erforderlich' }, { status: 400 });
    }

    const updated = await updateComment(commentId, { content, status, priority });
    if (!updated) {
      return NextResponse.json({ error: 'Kommentar nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ success: true, comment: updated });
  } catch (error) {
    console.error('Comments PUT error:', error);
    return NextResponse.json({ error: 'Kommentar konnte nicht aktualisiert werden' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'commentId erforderlich' }, { status: 400 });
    }

    const deleted = await deleteComment(commentId);
    if (!deleted) {
      return NextResponse.json({ error: 'Kommentar nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Comments DELETE error:', error);
    return NextResponse.json({ error: 'Kommentar konnte nicht gelöscht werden' }, { status: 500 });
  }
}
