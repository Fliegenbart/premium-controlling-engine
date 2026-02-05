/**
 * Audit Trail API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLog, logAudit } from '@/lib/auth';
import { validateSession, hasPermission } from '@/lib/auth';

async function getUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const session = await validateSession(token);
  return session.valid ? session.user : null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    // Only admins and controllers can view audit log
    if (!hasPermission(user, 'view')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Non-admins can only see their own audit log
    const filterUserId = hasPermission(user, '*') ? userId : user.id;

    const { entries, total } = await getAuditLog({
      userId: filterUserId,
      action,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      entries,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + entries.length < total
      }
    });
  } catch (error) {
    console.error('Audit GET error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Audit-Logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const body = await request.json();
    const { action, resource, details } = body;

    if (!action || !resource) {
      return NextResponse.json({ error: 'action und resource erforderlich' }, { status: 400 });
    }

    // Get IP from request
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    await logAudit(user.id, user.name, action, resource, details, ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Audit POST error:', error);
    return NextResponse.json({ error: 'Audit-Eintrag konnte nicht erstellt werden' }, { status: 500 });
  }
}
