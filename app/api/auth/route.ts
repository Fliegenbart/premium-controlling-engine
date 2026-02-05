/**
 * Authentication API
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, logout, validateSession, getUsers, createUser, hasPermission } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name, role, token } = body;

    switch (action) {
      case 'login': {
        if (!email || !password) {
          return NextResponse.json({ error: 'Email und Passwort erforderlich' }, { status: 400 });
        }
        const result = await authenticate(email, password);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 401 });
        }
        return NextResponse.json({
          success: true,
          user: result.user,
          token: result.token
        });
      }

      case 'logout': {
        if (token) {
          await logout(token);
        }
        return NextResponse.json({ success: true });
      }

      case 'validate': {
        if (!token) {
          return NextResponse.json({ valid: false }, { status: 401 });
        }
        const result = await validateSession(token);
        return NextResponse.json(result);
      }

      case 'register': {
        // Only admins can register new users
        if (!token) {
          return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
        }
        const session = await validateSession(token);
        if (!session.valid || !session.user || !hasPermission(session.user, '*')) {
          return NextResponse.json({ error: 'Nur Administratoren können Benutzer anlegen' }, { status: 403 });
        }

        if (!email || !password || !name || !role) {
          return NextResponse.json({ error: 'Alle Felder erforderlich' }, { status: 400 });
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
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

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
