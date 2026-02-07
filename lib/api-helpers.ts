import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateLimitEntry>();

function pruneBuckets(now: number) {
  if (rateBuckets.size < 1000) return;
  for (const [key, entry] of rateBuckets.entries()) {
    if (entry.resetAt <= now) rateBuckets.delete(key);
  }
}

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  const xr = request.headers.get('x-real-ip');
  if (xr) return xr;
  return 'unknown';
}

export function enforceRateLimit(
  request: NextRequest,
  options: { limit: number; windowMs: number; keyPrefix?: string }
): NextResponse | null {
  const now = Date.now();
  pruneBuckets(now);

  const keyPrefix = options.keyPrefix || request.nextUrl.pathname;
  const key = `${keyPrefix}:${getClientIp(request)}`;
  const entry = rateBuckets.get(key);

  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (entry.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte später erneut versuchen.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  entry.count += 1;
  return null;
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function getRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function jsonError(message: string, status: number, requestId: string): NextResponse {
  return NextResponse.json({ error: message, requestId }, { status });
}

export function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  const trimmed = auth.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice(7).trim();
  return token || null;
}

function secureTokenEquals(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function requireDocumentToken(request: NextRequest): NextResponse | null {
  const required = process.env.DOCUMENT_ACCESS_TOKEN;
  if (!required) return null;

  const headerToken = request.headers.get('x-doc-token');
  const bearer = getBearerToken(request);
  const queryToken = process.env.ALLOW_QUERY_TOKEN === 'true'
    ? request.nextUrl.searchParams.get('token')
    : null;

  const token = headerToken || bearer || queryToken;
  if (!token || !secureTokenEquals(required, token)) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  return null;
}

export function requireApiToken(
  request: NextRequest,
  envName: string = 'API_ACCESS_TOKEN'
): NextResponse | null {
  const required = process.env[envName];
  if (!required) {
    return NextResponse.json(
      { error: `Server-Konfiguration fehlt: ${envName}` },
      { status: 503 }
    );
  }

  const headerToken = request.headers.get('x-api-token');
  const bearer = getBearerToken(request);
  const token = headerToken || bearer;

  if (!token || !secureTokenEquals(required, token)) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  return null;
}

export function validateUploadFile(
  file: File | null | undefined,
  options: { maxBytes: number; allowedExtensions: string[]; label?: string }
): string | null {
  const label = options.label || 'Datei';

  if (!file) {
    return `${label} fehlt`;
  }

  if (file.size <= 0) {
    return `${label} ist leer`;
  }

  if (file.size > options.maxBytes) {
    const maxMb = Math.round((options.maxBytes / (1024 * 1024)) * 10) / 10;
    return `${label} zu groß (max. ${maxMb}MB)`;
  }

  const lowerName = file.name.toLowerCase();
  const allowed = options.allowedExtensions.some((ext) => lowerName.endsWith(ext.toLowerCase()));
  if (!allowed) {
    return `${label} hat ein nicht unterstütztes Format (${options.allowedExtensions.join(', ')})`;
  }

  return null;
}
