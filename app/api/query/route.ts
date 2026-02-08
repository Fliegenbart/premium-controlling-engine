/**
 * SQL Query API
 * POST /api/query
 * 
 * Execute SQL queries directly on DuckDB
 * Used by the agent for tool calling
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeSQL, initDatabase } from '@/lib/duckdb-engine';
import { SQLQueryRequest } from '@/lib/types';
import {
  enforceRateLimit,
  getRequestId,
  jsonError,
  requireApiToken,
  sanitizeError,
} from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

const MAX_SQL_LENGTH = 5000;
const READ_ONLY_START = /^\s*(SELECT|WITH|EXPLAIN)\b/i;
const FORBIDDEN_SQL = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|ATTACH|DETACH|COPY|CALL|PRAGMA|SET|CREATE|REPLACE|GRANT|REVOKE)\b/i;

function validateUserQuery(sql: string): string | null {
  const trimmed = sql.trim();
  if (!trimmed) return 'SQL Query ist erforderlich';
  if (trimmed.length > MAX_SQL_LENGTH) {
    return `SQL Query ist zu lang (max. ${MAX_SQL_LENGTH} Zeichen)`;
  }
  if (!READ_ONLY_START.test(trimmed)) {
    return 'Nur read-only SELECT/WITH/EXPLAIN Queries sind erlaubt';
  }

  // Ignore quoted strings before keyword checks.
  const stripped = trimmed
    .replace(/'([^']|'')*'/g, "''")
    .replace(/"([^"]|"")*"/g, '""');
  if (FORBIDDEN_SQL.test(stripped)) {
    return 'SQL enthält nicht erlaubte Operationen';
  }
  if (/;[\s\S]+\S/.test(stripped)) {
    return 'Mehrere Statements sind nicht erlaubt';
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId();
  try {
    if (process.env.QUERY_API_ENABLED !== 'true') {
      return jsonError('SQL Query API ist deaktiviert', 403, requestId);
    }

    const sessionAuth = await requireSessionUser(request, { permission: '*', requestId });
    if (sessionAuth instanceof NextResponse) return sessionAuth;

    const authError = requireApiToken(request, 'QUERY_API_TOKEN');
    if (authError) return authError;

    const rateLimit = enforceRateLimit(request, {
      limit: 20,
      windowMs: 60_000,
      keyPrefix: '/api/query'
    });
    if (rateLimit) return rateLimit;

    const body = await request.json().catch(() => null) as SQLQueryRequest | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: 'Ungültiges JSON-Format',
        requestId,
      }, { status: 400 });
    }
    const { sql, explain } = body;

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: 'SQL Query ist erforderlich',
        requestId,
      }, { status: 400 });
    }

    const validationError = validateUserQuery(sql);
    if (validationError) {
      return NextResponse.json({
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: validationError,
        requestId,
      }, { status: 400 });
    }

    // Initialize DuckDB if needed
    await initDatabase(process.env.DATABASE_PATH);

    let queryToRun = sql.trim();

    // Optionally explain the query first
    if (explain) {
      try {
        const explainSql = /^EXPLAIN\b/i.test(queryToRun)
          ? queryToRun
          : `EXPLAIN ${queryToRun}`;
        const explainResult = await executeSQL(explainSql);
        // Query plan logged for debugging
      } catch (e) {
        // Non-critical
      }
    }

    // Execute the query
    const result = await executeSQL(queryToRun);

    return NextResponse.json({
      success: true,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
      requestId,
    });

  } catch (error) {
    console.error('Query error:', requestId, sanitizeError(error));
    return NextResponse.json({
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: 'Query-Ausführung fehlgeschlagen',
      requestId,
    }, { status: 500 });
  }
}

// GET endpoint for simple queries via URL params
export async function GET(): Promise<NextResponse> {
  const requestId = getRequestId();
  return NextResponse.json({
    success: false,
    columns: [],
    rows: [],
    rowCount: 0,
    executionTimeMs: 0,
    error: 'Methode nicht erlaubt. Verwende POST.',
    requestId,
  }, { status: 405 });
}
