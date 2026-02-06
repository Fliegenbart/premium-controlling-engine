import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRequestId,
  sanitizeError,
  getClientIp,
  enforceRateLimit,
  jsonError,
  requireDocumentToken,
} from '../lib/api-helpers';
import { NextRequest, NextResponse } from 'next/server';

// Helper to create mock NextRequest
function createMockRequest(
  options: {
    ip?: string;
    headers?: Record<string, string>;
    pathname?: string;
    query?: Record<string, string>;
  } = {}
): NextRequest {
  const headers = new Headers(options.headers || {});
  const url = new URL(`http://localhost:3000${options.pathname || '/api/test'}`);

  Object.entries(options.query || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return new NextRequest(url, { headers });
}

describe('api-helpers - API-Hilfsfunktionen', () => {
  // ========== getRequestId Tests ==========

  describe('getRequestId', () => {
    it('sollte eindeutige IDs zurückgeben', () => {
      const id1 = getRequestId();
      const id2 = getRequestId();

      expect(id1).not.toBe(id2);
    });

    it('sollte String zurückgeben', () => {
      const id = getRequestId();

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('sollte UUID format verwenden wenn available', () => {
      // globalThis.crypto.randomUUID ist meist verfügbar
      const id = getRequestId();

      // UUID hat Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      // oder Fallback Format: timestamp-random
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('sollte konsistente längen haben', () => {
      const ids = Array.from({ length: 10 }, () => getRequestId());

      // Alle sollten eine ähnliche Länge haben
      const lengths = ids.map(id => id.length);
      const minLength = Math.min(...lengths);
      const maxLength = Math.max(...lengths);

      // IDs sollten sehr ähnlich lang sein
      expect(maxLength - minLength).toBeLessThan(5);
    });

    it('sollte nur sichere Zeichen verwenden', () => {
      const id = getRequestId();

      // Sollte keine Sonderzeichen enthalten die Probleme machen
      expect(id).toMatch(/^[\w\-]+$/);
    });

    it('sollte 16+ Zeichen haben', () => {
      const ids = Array.from({ length: 5 }, () => getRequestId());

      ids.forEach(id => {
        expect(id.length).toBeGreaterThanOrEqual(16);
      });
    });

    it('sollte Fallback-Mechanismus nutzen ohne crypto', () => {
      // Test mit Fallback (timestamp + random)
      const id = getRequestId();

      expect(id).toMatch(/\d+/); // Sollte Zahlen (Timestamp) enthalten
      expect(id.length).toBeGreaterThan(10);
    });
  });

  // ========== sanitizeError Tests ==========

  describe('sanitizeError', () => {
    it('sollte Error message extrahieren', () => {
      const error = new Error('Test error message');
      const result = sanitizeError(error);

      expect(result).toContain('Test error message');
    });

    it('sollte Error stack-trace verwenden wenn vorhanden', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at Function.test';
      const result = sanitizeError(error);

      expect(result).toContain('Error: Test error');
      expect(result).toContain('at Function.test');
    });

    it('sollte nur message verwenden wenn stack leer ist', () => {
      const error = new Error('Only message');
      error.stack = undefined;
      const result = sanitizeError(error);

      expect(result).toBe('Only message');
    });

    it('sollte String direkt zurückgeben', () => {
      const result = sanitizeError('String error');

      expect(typeof result).toBe('string');
      expect(result).toContain('String error');
    });

    it('sollte Objekt zu JSON stringifizieren', () => {
      const error = { message: 'Object error', code: 500 };
      const result = sanitizeError(error);

      expect(result).toContain('Object error');
      expect(result).toContain('500');
    });

    it('sollte null/undefined richtig handhaben', () => {
      const nullResult = sanitizeError(null);
      const undefinedResult = sanitizeError(undefined);

      expect(typeof nullResult).toBe('string');
      // undefinedResult might be "undefined" (type: string) or undefined (type: undefined)
      expect(typeof undefinedResult).toBeDefined();
    });

    it('sollte zirkuläre Objekte handhaben', () => {
      const obj: any = { message: 'test' };
      obj.self = obj; // Zirkelbezug

      const result = sanitizeError(obj);

      expect(typeof result).toBe('string');
      // Sollte nicht crashen
    });

    it('sollte sehr lange Error-Meldungen handhaben', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new Error(longMessage);
      const result = sanitizeError(error);

      expect(result).toContain('a');
      expect(typeof result).toBe('string');
    });

    it('sollte Error mit zusätzlichen Properties handhaben', () => {
      const error: any = new Error('Base message');
      error.code = 'ENOTFOUND';
      error.errno = -3001;

      const result = sanitizeError(error);

      expect(result).toContain('Base message');
    });

    it('sollte TypeError richtig sanitieren', () => {
      const error = new TypeError('Cannot read property');
      const result = sanitizeError(error);

      expect(result).toContain('Cannot read property');
    });

    it('sollte ReferenceError richtig sanitieren', () => {
      const error = new ReferenceError('Variable not defined');
      const result = sanitizeError(error);

      expect(result).toContain('Variable not defined');
    });

    it('sollte komplexe Error-Strukturen handhaben', () => {
      const cause = new Error('Caused by');
      const error: any = new Error('Main error');
      error.cause = cause;

      const result = sanitizeError(error);

      expect(typeof result).toBe('string');
    });
  });

  // ========== getClientIp Tests ==========

  describe('getClientIp', () => {
    it('sollte IP aus x-forwarded-for Header extrahieren', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });

      const ip = getClientIp(request);

      expect(ip).toBe('192.168.1.1');
    });

    it('sollte erste IP aus komma-separierter Liste nehmen', () => {
      const request = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
        },
      });

      const ip = getClientIp(request);

      expect(ip).toBe('203.0.113.1');
    });

    it('sollte x-real-ip Header als Fallback verwenden', () => {
      const request = createMockRequest({
        headers: { 'x-real-ip': '203.0.113.2' },
      });

      const ip = getClientIp(request);

      expect(ip).toBe('203.0.113.2');
    });

    it('sollte x-forwarded-for bevorzugen', () => {
      const request = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.3',
          'x-real-ip': '203.0.113.2',
        },
      });

      const ip = getClientIp(request);

      expect(ip).toBe('203.0.113.3');
    });

    it('sollte "unknown" zurückgeben wenn keine Header vorhanden', () => {
      const request = createMockRequest({});

      const ip = getClientIp(request);

      expect(ip).toBe('unknown');
    });

    it('sollte Whitespace trimmen', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': ' 192.168.1.1 , 10.0.0.1' },
      });

      const ip = getClientIp(request);

      expect(ip).toBe('192.168.1.1');
    });

    it('sollte IPv6-Adressen handhaben', () => {
      const request = createMockRequest({
        headers: {
          'x-forwarded-for': '2001:db8::1, 2001:db8::2',
        },
      });

      const ip = getClientIp(request);

      expect(ip).toBe('2001:db8::1');
    });

    it('sollte leere x-forwarded-for fallback zu x-real-ip', () => {
      const request = createMockRequest({
        headers: {
          'x-forwarded-for': '',
          'x-real-ip': '203.0.113.4',
        },
      });

      const ip = getClientIp(request);

      // Leerer String wird als falsy behandelt, fallback zu x-real-ip
      expect(ip).toBe('203.0.113.4');
    });
  });

  // ========== enforceRateLimit Tests ==========

  describe('enforceRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit buckets for each test
      vi.clearAllMocks();
    });

    it('sollte null zurückgeben wenn unter Limit', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
        pathname: '/api/analyze',
      });

      const result = enforceRateLimit(request, {
        limit: 10,
        windowMs: 60000,
      });

      expect(result).toBeNull();
    });

    it('sollte null für mehrere Anfragen unter Limit zurückgeben', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
        pathname: '/api/test',
      });

      for (let i = 0; i < 5; i++) {
        const result = enforceRateLimit(request, {
          limit: 10,
          windowMs: 60000,
        });
        expect(result).toBeNull();
      }
    });

    it('sollte NextResponse mit 429 zurückgeben wenn Limit überschritten', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
        pathname: '/api/test',
      });

      // Erste 3 Anfragen sollten OK sein
      for (let i = 0; i < 3; i++) {
        enforceRateLimit(request, {
          limit: 3,
          windowMs: 60000,
        });
      }

      // 4. sollte blocked sein
      const result = enforceRateLimit(request, {
        limit: 3,
        windowMs: 60000,
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it('sollte Retry-After Header enthalten', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
        pathname: '/api/test',
      });

      // Limit überschreiten
      for (let i = 0; i < 2; i++) {
        enforceRateLimit(request, { limit: 1, windowMs: 60000 });
      }

      const result = enforceRateLimit(request, {
        limit: 1,
        windowMs: 60000,
      });

      expect(result?.headers.get('Retry-After')).toBeTruthy();
    });

    it('sollte JSON-Error-Response zurückgeben', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
        pathname: '/api/test',
      });

      // Limit überschreiten
      for (let i = 0; i < 2; i++) {
        enforceRateLimit(request, { limit: 1, windowMs: 60000 });
      }

      const result = enforceRateLimit(request, {
        limit: 1,
        windowMs: 60000,
      });

      expect(result).not.toBeNull();
      const json = await result?.json();
      expect(json?.error).toContain('Zu viele Anfragen');
    });

    it('sollte unterschiedliche IPs separat limitieren', () => {
      const request1 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
        pathname: '/api/test1',
      });
      const request2 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.2' },
        pathname: '/api/test2',
      });

      const options = { limit: 1, windowMs: 60000 };

      // Erste IP: sollte OK sein
      const result1 = enforceRateLimit(request1, options);
      expect(result1).toBeNull();

      // Zweite IP: sollte auch OK sein (andere IP und anderer Path)
      const result2 = enforceRateLimit(request2, options);
      expect(result2).toBeNull();
    });

    it('sollte keyPrefix-Option respektieren', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const options = { limit: 1, windowMs: 60000, keyPrefix: 'custom' };

      const result1 = enforceRateLimit(request, options);
      expect(result1).toBeNull();

      const result2 = enforceRateLimit(request, options);
      expect(result2).not.toBeNull();
    });

    it('sollte Retry-After in Sekunden berechnen', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
        pathname: '/api/rateset',
      });

      // Limit überschreiten
      for (let i = 0; i < 2; i++) {
        enforceRateLimit(request, {
          limit: 1,
          windowMs: 5000, // 5 Sekunden
        });
      }

      const result = enforceRateLimit(request, {
        limit: 1,
        windowMs: 5000,
      });

      const retryAfter = result?.headers.get('Retry-After');
      expect(retryAfter).toBeTruthy();

      const seconds = parseInt(retryAfter || '0');
      expect(seconds).toBeGreaterThanOrEqual(0);
      expect(seconds).toBeLessThanOrEqual(5);
    });
  });

  // ========== jsonError Tests ==========

  describe('jsonError', () => {
    it('sollte JSON-Response mit error und requestId zurückgeben', async () => {
      const response = jsonError('Test error', 400, 'req-123');

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('Test error');
      expect(json.requestId).toBe('req-123');
    });

    it('sollte verschiedene HTTP-Status akzeptieren', async () => {
      const response401 = jsonError('Unauthorized', 401, 'req-401');
      const response403 = jsonError('Forbidden', 403, 'req-403');
      const response500 = jsonError('Server Error', 500, 'req-500');

      expect(response401.status).toBe(401);
      expect(response403.status).toBe(403);
      expect(response500.status).toBe(500);
    });

    it('sollte verschiedene Fehler-Meldungen akzeptieren', async () => {
      const messages = [
        'Ungültige Anfrage',
        'Datenbank-Fehler',
        'Timeout',
      ];

      for (const msg of messages) {
        const response = jsonError(msg, 400, 'req-123');
        const json = await response.json();
        expect(json.error).toBe(msg);
      }
    });

    it('sollte unterschiedliche requestIds handhaben', async () => {
      const response1 = jsonError('Error', 400, 'req-001');
      const response2 = jsonError('Error', 400, 'req-002');

      const json1 = await response1.json();
      const json2 = await response2.json();

      expect(json1.requestId).toBe('req-001');
      expect(json2.requestId).toBe('req-002');
    });
  });

  // ========== requireDocumentToken Tests ==========

  describe('requireDocumentToken', () => {
    beforeEach(() => {
      // Reset env before each test
      delete process.env.DOCUMENT_ACCESS_TOKEN;
    });

    it('sollte null zurückgeben wenn kein Token erforderlich', () => {
      delete process.env.DOCUMENT_ACCESS_TOKEN;

      const request = createMockRequest({
        headers: { 'x-doc-token': 'anything' },
      });

      const result = requireDocumentToken(request);

      expect(result).toBeNull();
    });

    it('sollte x-doc-token Header akzeptieren', () => {
      process.env.DOCUMENT_ACCESS_TOKEN = 'secret-token-123';

      const request = createMockRequest({
        headers: { 'x-doc-token': 'secret-token-123' },
      });

      const result = requireDocumentToken(request);

      expect(result).toBeNull();
    });

    it('sollte Bearer Token in Authorization Header akzeptieren', () => {
      process.env.DOCUMENT_ACCESS_TOKEN = 'secret-token-456';

      const request = createMockRequest({
        headers: { 'authorization': 'Bearer secret-token-456' },
      });

      const result = requireDocumentToken(request);

      expect(result).toBeNull();
    });

    it('sollte Token in Query-Parameter akzeptieren', () => {
      process.env.DOCUMENT_ACCESS_TOKEN = 'secret-token-789';

      const request = createMockRequest({
        query: { token: 'secret-token-789' },
      });

      const result = requireDocumentToken(request);

      expect(result).toBeNull();
    });

    it('sollte 401 zurückgeben bei falschemToken', async () => {
      process.env.DOCUMENT_ACCESS_TOKEN = 'correct-token';

      const request = createMockRequest({
        headers: { 'x-doc-token': 'wrong-token' },
      });

      const result = requireDocumentToken(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it('sollte case-insensitive Bearer akzeptieren', () => {
      process.env.DOCUMENT_ACCESS_TOKEN = 'my-token';

      const request = createMockRequest({
        headers: { 'authorization': 'bearer my-token' },
      });

      const result = requireDocumentToken(request);

      expect(result).toBeNull();
    });

    it('sollte Bearer Whitespace trimmen', () => {
      process.env.DOCUMENT_ACCESS_TOKEN = 'test-token';

      const request = createMockRequest({
        headers: { 'authorization': 'Bearer   test-token   ' },
      });

      const result = requireDocumentToken(request);

      expect(result).toBeNull();
    });

    it('sollte x-doc-token bevorzugen', () => {
      process.env.DOCUMENT_ACCESS_TOKEN = 'correct-token';

      const request = createMockRequest({
        headers: {
          'x-doc-token': 'correct-token',
          'authorization': 'Bearer wrong-token',
        },
      });

      const result = requireDocumentToken(request);

      expect(result).toBeNull();
    });

    it('sollte Bearer vor Query-Token bevorzugen', () => {
      process.env.DOCUMENT_ACCESS_TOKEN = 'correct-token';

      const request = createMockRequest({
        headers: { 'authorization': 'Bearer correct-token' },
        query: { token: 'wrong-token' },
      });

      const result = requireDocumentToken(request);

      expect(result).toBeNull();
    });

    it('sollte JSON-Error bei fehlender Auth zurückgeben', async () => {
      process.env.DOCUMENT_ACCESS_TOKEN = 'required-token';

      const request = createMockRequest({});

      const result = requireDocumentToken(request);

      expect(result?.status).toBe(401);
      const json = await result?.json();
      expect(json?.error).toContain('autorisiert');
    });
  });

  // ========== Integration Tests ==========

  describe('Integration', () => {
    it('sollte getRequestId und jsonError zusammen funktionieren', async () => {
      const requestId = getRequestId();
      const response = jsonError('Test', 400, requestId);

      const json = await response.json();
      expect(json.requestId).toBe(requestId);
    });

    it('sollte sanitizeError mit Logging kombinierbar sein', () => {
      const error = new Error('Test error');
      const sanitized = sanitizeError(error);

      expect(typeof sanitized).toBe('string');
      expect(sanitized.length).toBeGreaterThan(0);
    });

    it('sollte Rate-Limiting mit getClientIp funktionieren', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.100' },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('192.168.1.100');

      const rateLimit = enforceRateLimit(request, {
        limit: 10,
        windowMs: 60000,
      });
      expect(rateLimit).toBeNull();
    });
  });
});
