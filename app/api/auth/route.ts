/**
 * Authentication API
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, logout, validateSession, getUsers, createUser, hasPermission } from '@/lib/auth';
import { enforceRateLimit, getBearerToken } from '@/lib/api-helpers';

const SESSION_COOKIE = 'ce_session';

function resolveToken(request: NextRequest, fallback?: string): string | null {
  return getBearerToken(request) || request.cookies.get(SESSION_COOKIE)?.value || fallback || null;
}

function resolveCookieSecure(request: NextRequest): boolean {
  const forced = process.env.COOKIE_SECURE;
  if (forced === 'true') return true;
  if (forced === 'false') return false;

  // Prefer forwarded proto when behind a reverse proxy (Traefik/Nginx/Cloudflare).
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) return forwardedProto.split(',')[0]?.trim() === 'https';

  return request.nextUrl.protocol === 'https:';
}

function setSessionCookie(request: NextRequest, response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: resolveCookieSecure(request),
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  });
}

function clearSessionCookie(request: NextRequest, response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: resolveCookieSecure(request),
    path: '/',
    maxAge: 0,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name, role, token } = body;

    switch (action) {
      case 'login': {
        const loginRateLimit = enforceRateLimit(request, {
          limit: 8,
          windowMs: 60_000,
          keyPrefix: '/api/auth/login'
        });
        if (loginRateLimit) return loginRateLimit;

        if (!email || !password) {
          return NextResponse.json({ error: 'Email und Passwort erforderlich' }, { status: 400 });
        }
        const result = await authenticate(email, password);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 401 });
        }
        const response = NextResponse.json({
          success: true,
          user: result.user,
          token: result.token
        });
        if (result.token) setSessionCookie(request, response, result.token);
        return response;
      }

      case 'logout': {
        const sessionToken = resolveToken(request, token);
        if (sessionToken) {
          await logout(sessionToken);
        }
        const response = NextResponse.json({ success: true });
        clearSessionCookie(request, response);
        return response;
      }

      case 'validate': {
        const sessionToken = resolveToken(request, token);
        if (!sessionToken) {
          return NextResponse.json({ valid: false }, { status: 401 });
        }
        const result = await validateSession(sessionToken);
        return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
      }

      case 'register': {
        // Only admins can register new users
        const sessionToken = resolveToken(request, token);
        if (!sessionToken) {
          return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
        }
        const session = await validateSession(sessionToken);
        if (!session.valid || !session.user || !hasPermission(session.user, '*')) {
          return NextResponse.json({ error: 'Nur Administratoren können Benutzer anlegen' }, { status: 403 });
        }

        if (!email || !password || !name || !role) {
          return NextResponse.json({ error: 'Alle Felder erforderlich' }, { status: 400 });
        }
        if (!['admin', 'controller', 'viewer'].includes(role)) {
          return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 });
        }

        const result = await createUser(email, name, password, role);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, user: result.user });
      }

      default:
        return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentifizierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = resolveToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const session = await validateSession(token);
    if (!session.valid || !session.user) {
      return NextResponse.json({ error: 'Ungültige Session' }, { status: 401 });
    }

    // Only admins can list users
    if (!hasPermission(session.user, '*')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const users = await getUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Auth GET error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Benutzer' }, { status: 500 });
  }
}
