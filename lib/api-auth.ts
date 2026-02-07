import { NextRequest, NextResponse } from 'next/server';
import { getBearerToken, getRequestId, jsonError } from '@/lib/api-helpers';
import { hasPermission, validateSession, type User } from '@/lib/auth';

const SESSION_COOKIE = 'ce_session';

export type SafeUser = Omit<User, 'passwordHash'>;

export function getSessionToken(request: NextRequest): string | null {
  return getBearerToken(request) || request.cookies.get(SESSION_COOKIE)?.value || null;
}

export async function requireSessionUser(
  request: NextRequest,
  options?: { permission?: string; requestId?: string }
): Promise<{ user: SafeUser; token: string } | NextResponse> {
  const requestId = options?.requestId || getRequestId();

  const token = getSessionToken(request);
  if (!token) {
    return jsonError('Nicht angemeldet', 401, requestId);
  }

  const session = await validateSession(token);
  if (!session.valid || !session.user) {
    return jsonError('Ungültige Session', 401, requestId);
  }

  if (options?.permission && !hasPermission(session.user, options.permission)) {
    return jsonError('Keine Berechtigung', 403, requestId);
  }

  return { user: session.user, token };
}

