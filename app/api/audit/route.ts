/**
 * Audit Trail API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLog, logAudit } from '@/lib/auth';
import { hasPermission } from '@/lib/auth';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'view', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 30, windowMs: 60_000, keyPrefix: '/api/audit/get' });
    if (rateLimit) return rateLimit;
    const user = auth.user;

    // Only admins and controllers can view audit log
    if (!hasPermission(user, 'view')) {
      return jsonError('Keine Berechtigung', 403, requestId);
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const rawOffset = parseInt(searchParams.get('offset') || '0');
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, rawLimit)) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

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
    console.error('Audit GET error:', requestId, sanitizeError(error));
    return jsonError('Fehler beim Laden des Audit-Logs', 500, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: 'view', requestId });
    if (auth instanceof NextResponse) return auth;

    const rateLimit = enforceRateLimit(request, { limit: 40, windowMs: 60_000, keyPrefix: '/api/audit/post' });
    if (rateLimit) return rateLimit;
    const user = auth.user;

    const body = await request.json();
    const { action, resource, details } = body;

    if (!action || !resource) {
      return jsonError('action und resource erforderlich', 400, requestId);
    }
    if (typeof action !== 'string' || action.length > 100 || typeof resource !== 'string' || resource.length > 200) {
      return jsonError('Ungültige action/resource Werte', 400, requestId);
    }

    // Get IP from request
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    await logAudit(user.id, user.name, action, resource, details, ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Audit POST error:', requestId, sanitizeError(error));
    return jsonError('Audit-Eintrag konnte nicht erstellt werden', 500, requestId);
  }
}
