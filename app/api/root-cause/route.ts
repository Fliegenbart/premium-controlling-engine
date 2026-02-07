/**
 * Root Cause Analysis API
 * POST /api/root-cause
 *
 * Analyzes variances and decomposes them into:
 * - Booking clusters (grouped by similarity and characteristics)
 * - Dimensional drivers (vendor, cost_center, month, text patterns)
 * - Confidence scores and AI narratives (optional)
 *
 * Request body:
 * {
 *   account: number (required)
 *   prevBookings: Booking[] (required)
 *   currBookings: Booking[] (required)
 *   includeLLMNarrative?: boolean (optional, default: false)
 * }
 *
 * Response: RootCause object
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeRootCauses, analyzeRootCausesBatch } from '@/lib/root-cause-analysis';
import {
  rootCauseRequestSchema,
  rootCauseBatchRequestSchema,
} from '@/lib/validation';
import {
  enforceRateLimit,
  getRequestId,
  jsonError,
  sanitizeError,
} from '@/lib/api-helpers';
import { requireSessionUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const auth = await requireSessionUser(request, { permission: 'analyze', requestId });
    if (auth instanceof NextResponse) return auth;

    // Enforce rate limiting: 10 requests per minute
    const rateLimit = enforceRateLimit(request, {
      limit: 10,
      windowMs: 60_000,
      keyPrefix: '/api/root-cause',
    });
    if (rateLimit) return rateLimit;

    // Parse request body
    const body = await request.json();

    // Determine if this is a batch request
    const isBatch = Array.isArray(body.accounts);

    if (isBatch) {
      // Batch analysis
      const parsed = rootCauseBatchRequestSchema.safeParse(body);
      if (!parsed.success) {
        return jsonError(
          'Ungültige Anfrageparameter (Batch-Modus)',
          400,
          requestId
        );
      }

      const { accounts, prevBookings, currBookings, includeLLMNarrative } =
        parsed.data;

      // Validate input
      if (!prevBookings || !Array.isArray(prevBookings) || prevBookings.length === 0) {
        return jsonError(
          'Vorjahr-Buchungen fehlen oder sind leer',
          400,
          requestId
        );
      }

      if (!currBookings || !Array.isArray(currBookings) || currBookings.length === 0) {
        return jsonError(
          'Aktuelle Buchungen fehlen oder sind leer',
          400,
          requestId
        );
      }

      // Ensure accounts exist in the data
      const availableAccounts = new Set([
        ...prevBookings.map((b) => b.account),
        ...currBookings.map((b) => b.account),
      ]);

      const validAccounts = accounts.filter((a) => availableAccounts.has(a));
      if (validAccounts.length === 0) {
        return jsonError(
          'Keine der angeforderten Konten in den Buchungsdaten vorhanden',
          400,
          requestId
        );
      }

      // Run batch analysis
      const results = await analyzeRootCausesBatch(
        prevBookings,
        currBookings,
        validAccounts,
        { includeLLMNarrative: includeLLMNarrative ?? false }
      );

      return NextResponse.json(
        {
          requestId,
          mode: 'batch',
          count: results.length,
          results,
        },
        { status: 200 }
      );
    } else {
      // Single account analysis
      const parsed = rootCauseRequestSchema.safeParse(body);
      if (!parsed.success) {
        return jsonError('Ungültige Anfrageparameter', 400, requestId);
      }

      const { account, prevBookings, currBookings, includeLLMNarrative } =
        parsed.data;

      // Validate input
      if (!prevBookings || !Array.isArray(prevBookings) || prevBookings.length === 0) {
        return jsonError(
          'Vorjahr-Buchungen fehlen oder sind leer',
          400,
          requestId
        );
      }

      if (!currBookings || !Array.isArray(currBookings) || currBookings.length === 0) {
        return jsonError(
          'Aktuelle Buchungen fehlen oder sind leer',
          400,
          requestId
        );
      }

      // Check if account exists in the data
      const accountExists = [
        ...prevBookings.map((b) => b.account),
        ...currBookings.map((b) => b.account),
      ].includes(account);

      if (!accountExists) {
        return jsonError(
          `Konto ${account} nicht in den Buchungsdaten gefunden`,
          404,
          requestId
        );
      }

      // Run analysis
      const result = await analyzeRootCauses(
        prevBookings,
        currBookings,
        account,
        { includeLLMNarrative: includeLLMNarrative ?? false }
      );

      return NextResponse.json(
        {
          requestId,
          mode: 'single',
          result,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error(
      'Root cause analysis error:',
      requestId,
      sanitizeError(error)
    );
    return jsonError(
      'Ursachenanalyse fehlgeschlagen. Bitte versuchen Sie es später erneut.',
      500,
      requestId
    );
  }
}
