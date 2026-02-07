import { NextRequest, NextResponse } from 'next/server';
import { executeNaturalLanguageQuery } from '@/lib/nl-query-engine';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';
import { initDatabase } from '@/lib/duckdb-engine';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    // Rate limiting: 20 requests per minute per IP
    const rateLimit = enforceRateLimit(request, {
      limit: 20,
      windowMs: 60_000,
      keyPrefix: '/api/nl-query'
    });
    if (rateLimit) return rateLimit;

    // Parse request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonError('Ungültiges JSON-Format', 400, requestId);
    }

    const { question, tables, maxRows, explain } = body as {
      question?: string;
      tables?: string[];
      maxRows?: number;
      explain?: boolean;
    };

    // Validate question
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return jsonError('Frage ist erforderlich und darf nicht leer sein', 400, requestId);
    }

    if (question.length > 1000) {
      return jsonError('Frage ist zu lang (max. 1000 Zeichen)', 400, requestId);
    }

    // Validate tables if provided
    let availableTables = ['controlling.bookings'];
    if (tables && Array.isArray(tables)) {
      const validTableNames = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
      const validTables = tables.filter(
        t => typeof t === 'string' && validTableNames.test(t)
      );
      if (validTables.length > 0) {
        availableTables = validTables;
      }
    }

    // Validate maxRows
    const limit = typeof maxRows === 'number' && maxRows > 0 && maxRows <= 10000
      ? maxRows
      : 1000;

    // Initialize database (ensures it's ready)
    await initDatabase();

    // Execute query with timeout
    const queryPromise = executeNaturalLanguageQuery(
      question,
      availableTables,
      { maxRows: limit, explain }
    );

    // 30 second timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query-Timeout (30s überschritten)')), 30000)
    );

    const result = await Promise.race([queryPromise, timeoutPromise]);

    // Return result
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('NL-Query error:', requestId, sanitizeError(error));

    const message = (error as Error).message || String(error);

    // Different error messages based on error type
    if (message.includes('Ollama')) {
      return jsonError(
        'LLM-Service (Ollama) ist nicht verfügbar. Bitte stellen Sie sicher, dass Ollama läuft.',
        503,
        requestId
      );
    }

    if (message.includes('SQL-Validierung')) {
      return jsonError(
        message,
        400,
        requestId
      );
    }

    if (message.includes('Timeout')) {
      return jsonError(
        'Query-Timeout: Die Abfrage hat zu lange gedauert. Versuchen Sie eine spezifischere Frage.',
        408,
        requestId
      );
    }

    // Generic error
    return jsonError(
      'Fehler bei der Verarbeitung der Frage. Bitte versuchen Sie es später erneut.',
      500,
      requestId
    );
  }
}
