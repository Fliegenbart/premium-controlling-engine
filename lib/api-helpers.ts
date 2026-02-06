import { NextRequest, NextResponse } from 'next/server';

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

export function requireDocumentToken(request: NextRequest): NextResponse | null {
  const required = process.env.DOCUMENT_ACCESS_TOKEN;
  if (!required) return null;

  const headerToken = request.headers.get('x-doc-token');
  const auth = request.headers.get('authorization');
  const bearer = auth?.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : null;
  const queryToken = request.nextUrl.searchParams.get('token');

  const token = headerToken || bearer || queryToken;
  if (token !== required) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  return null;
}
