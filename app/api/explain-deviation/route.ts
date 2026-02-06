/**
 * Explain Deviation API - AI Auto-Comments for KI-Abweichungskommentare
 * POST /api/explain-deviation
 *
 * Analyzes deviations using pure data heuristics (no LLM required) to explain:
 * - Why a specific account deviation happened
 * - Key contributing factors
 * - Largest single bookings
 * - Detected patterns (seasonal, structural, one-time, trend)
 *
 * Request body:
 * {
 *   deviation: AccountDeviation (required)
 *   prevBookings: Booking[] (required)
 *   currBookings: Booking[] (required)
 * }
 *
 * Response:
 * {
 *   summary: string (1-2 sentence summary)
 *   factors: Array<{ label, impact, type }>
 *   topBookings: Array<{ description, amount, date }>
 *   pattern: 'seasonal' | 'structural' | 'one-time' | 'trend'
 *   confidence: number (0-1)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { AccountDeviation, Booking } from '@/lib/types';
import { jsonError, getRequestId, sanitizeError } from '@/lib/api-helpers';

interface ExplanationResponse {
  summary: string;
  factors: Array<{
    label: string;
    impact: number;
    type: 'increase' | 'decrease';
  }>;
  topBookings: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
  pattern: 'seasonal' | 'structural' | 'one-time' | 'trend';
  confidence: number;
}

interface Factor {
  label: string;
  impact: number;
  type: 'increase' | 'decrease';
  evidence: string[];
}

/**
 * Group bookings by month (YYYY-MM)
 */
function groupByMonth(
  bookings: Booking[]
): Map<string, { count: number; amount: number; bookings: Booking[] }> {
  const map = new Map<string, { count: number; amount: number; bookings: Booking[] }>();

  for (const booking of bookings) {
    const month = booking.posting_date.substring(0, 7);
    if (!map.has(month)) {
      map.set(month, { count: 0, amount: 0, bookings: [] });
    }
    const entry = map.get(month)!;
    entry.count += 1;
    entry.amount += booking.amount;
    entry.bookings.push(booking);
  }

  return map;
}

/**
 * Detect if a set of booking descriptions is new (didn't exist in previous period)
 */
function findNewBookingTypes(
  prevBookings: Booking[],
  currBookings: Booking[]
): Map<string, { count: number; amount: number }> {
  const prevTexts = new Set(prevBookings.map((b) => b.text.toLowerCase().trim()));
  const newDescriptions = new Map<string, { count: number; amount: number }>();

  for (const booking of currBookings) {
    const text = booking.text.toLowerCase().trim();
    if (!prevTexts.has(text)) {
      if (!newDescriptions.has(booking.text)) {
        newDescriptions.set(booking.text, { count: 0, amount: 0 });
      }
      const entry = newDescriptions.get(booking.text)!;
      entry.count += 1;
      entry.amount += booking.amount;
    }
  }

  return newDescriptions;
}

/**
 * Find top N bookings by absolute amount
 */
function getTopBookings(bookings: Booking[], n: number = 5): Booking[] {
  return [...bookings]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, n);
}

/**
 * Analyze patterns to determine type
 */
function analyzePattern(
  prevMonthly: Map<string, { count: number; amount: number }>,
  currMonthly: Map<string, { count: number; amount: number }>,
  totalDelta: number,
  newFactorImpact: number,
  largestBookingAmount: number
): 'seasonal' | 'structural' | 'one-time' | 'trend' {
  // One-time: single large booking accounts for most of the delta
  if (
    Math.abs(largestBookingAmount) > Math.abs(totalDelta) * 0.7 &&
    Math.abs(largestBookingAmount) > Math.abs(totalDelta) * 0.5
  ) {
    return 'one-time';
  }

  // Structural: delta is mostly from new factors or consistent change across all months
  const currMonths = Array.from(currMonthly.values());
  if (newFactorImpact > Math.abs(totalDelta) * 0.5) {
    return 'structural';
  }

  // Check if change is consistent across months (structural) or varies (seasonal)
  if (currMonths.length > 1) {
    const monthlyDeltas = Array.from(currMonthly.entries()).map(([month, curr]) => {
      const prev = prevMonthly.get(month) || { amount: 0 };
      return curr.amount - prev.amount;
    });

    const avgDelta = monthlyDeltas.reduce((a, b) => a + b, 0) / monthlyDeltas.length;
    const variance = monthlyDeltas.reduce((sum, delta) => sum + Math.pow(delta - avgDelta, 2), 0) / monthlyDeltas.length;
    const stdDev = Math.sqrt(variance);

    // High variance across months = seasonal
    if (stdDev > Math.abs(avgDelta) * 0.5) {
      return 'seasonal';
    }
  }

  // Trend: gradual increase/decrease month-over-month
  const sortedMonths = Array.from(prevMonthly.keys()).sort();
  if (sortedMonths.length >= 3) {
    let increasingMonths = 0;
    for (let i = 1; i < sortedMonths.length; i++) {
      const prev = prevMonthly.get(sortedMonths[i - 1])?.amount || 0;
      const curr = prevMonthly.get(sortedMonths[i])?.amount || 0;
      if (curr > prev) increasingMonths++;
    }
    if (increasingMonths > sortedMonths.length * 0.6) {
      return 'trend';
    }
  }

  return 'structural';
}

/**
 * Calculate confidence based on how well we can explain the delta
 */
function calculateConfidence(
  explainedAmount: number,
  totalDelta: number,
  numFactors: number
): number {
  if (totalDelta === 0) return 0.5;

  const explanationRatio = Math.abs(explainedAmount) / Math.abs(totalDelta);
  const ratioConfidence = Math.min(1, explanationRatio);

  // More factors = slightly less confidence (might be noise)
  const factorPenalty = Math.max(0, 1 - numFactors * 0.05);

  return Math.min(1, ratioConfidence * 0.7 + 0.3) * factorPenalty;
}

/**
 * Main analysis function - pure data heuristics, no LLM
 */
function analyzeDeviation(
  deviation: AccountDeviation,
  prevBookings: Booking[],
  currBookings: Booking[]
): ExplanationResponse {
  const totalDelta = deviation.delta_abs;
  const factors: Factor[] = [];

  // Filter to relevant account
  const prevRelevant = prevBookings.filter((b) => b.account === deviation.account);
  const currRelevant = currBookings.filter((b) => b.account === deviation.account);

  // 1. Group by month to detect patterns
  const prevMonthly = groupByMonth(prevRelevant);
  const currMonthly = groupByMonth(currRelevant);

  // 2. Detect new booking types
  const newTypes = findNewBookingTypes(prevRelevant, currRelevant);
  let newTypeImpact = 0;
  for (const [description, stats] of newTypes.entries()) {
    if (stats.amount !== 0) {
      factors.push({
        label: `Neue Buchungsart: ${description.substring(0, 40)}`,
        impact: stats.amount,
        type: stats.amount > 0 ? 'increase' : 'decrease',
        evidence: [`${stats.count} neue Buchung(en) mit diesem Text`],
      });
      newTypeImpact += stats.amount;
    }
  }

  // 3. Detect volume changes in top dimensions
  const vendorPrev = new Map<string | null, number>();
  const vendorCurr = new Map<string | null, number>();

  for (const b of prevRelevant) {
    vendorPrev.set(b.vendor, (vendorPrev.get(b.vendor) || 0) + b.amount);
  }

  for (const b of currRelevant) {
    vendorCurr.set(b.vendor, (vendorCurr.get(b.vendor) || 0) + b.amount);
  }

  // Find significant vendor changes
  const allVendors = new Set([...vendorPrev.keys(), ...vendorCurr.keys()]);
  const vendorDeltas: Array<{ vendor: string | null; delta: number; prev: number; curr: number }> = [];

  for (const vendor of allVendors) {
    const prev = vendorPrev.get(vendor) || 0;
    const curr = vendorCurr.get(vendor) || 0;
    const delta = curr - prev;

    if (Math.abs(delta) > Math.abs(totalDelta) * 0.1) {
      vendorDeltas.push({ vendor, delta, prev, curr });
    }
  }

  vendorDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  for (const vd of vendorDeltas.slice(0, 3)) {
    const vendorLabel = vd.vendor || '(Kein Lieferant)';
    if (vd.prev === 0 && vd.curr !== 0) {
      factors.push({
        label: `Neuer Lieferant: ${vendorLabel}`,
        impact: vd.delta,
        type: vd.delta > 0 ? 'increase' : 'decrease',
        evidence: [
          `Größe: ${Math.abs(vd.curr).toLocaleString('de-DE')} EUR`,
          `Vorher: ${vd.prev}, Nachher: ${vd.curr}`,
        ],
      });
    } else if (vd.prev !== 0 && vd.curr === 0) {
      factors.push({
        label: `Lieferant wegfallen: ${vendorLabel}`,
        impact: vd.delta,
        type: vd.delta > 0 ? 'increase' : 'decrease',
        evidence: [
          `Frühere Größe: ${Math.abs(vd.prev).toLocaleString('de-DE')} EUR`,
          `Vollständiger Wegfall`,
        ],
      });
    } else {
      factors.push({
        label: `Lieferantenänderung: ${vendorLabel}`,
        impact: vd.delta,
        type: vd.delta > 0 ? 'increase' : 'decrease',
        evidence: [
          `Von: ${Math.abs(vd.prev).toLocaleString('de-DE')} EUR`,
          `Zu: ${Math.abs(vd.curr).toLocaleString('de-DE')} EUR`,
          `Änderung: ${Math.abs(vd.delta).toLocaleString('de-DE')} EUR`,
        ],
      });
    }
  }

  // 4. Find top bookings to explain delta
  const topCurr = getTopBookings(currRelevant, 10);
  const topBookingsForResponse = topCurr.slice(0, 5).map((b) => ({
    description: b.text,
    amount: b.amount,
    date: b.posting_date,
  }));

  const largestBookingAmount = topCurr.length > 0 ? topCurr[0].amount : 0;

  // 5. Detect count changes (hiring/reduction indicators)
  const prevCount = prevRelevant.length;
  const currCount = currRelevant.length;
  const countChange = currCount - prevCount;

  if (Math.abs(countChange) > 5) {
    const countLabel = countChange > 0 ? 'Anzahl Buchungen gestiegen' : 'Anzahl Buchungen gesunken';
    const details = `Von ${prevCount} auf ${currCount} (${countChange > 0 ? '+' : ''}${countChange})`;
    factors.push({
      label: countLabel,
      impact: 0, // Will be calculated from actual delta
      type: countChange > 0 ? 'increase' : 'decrease',
      evidence: [details],
    });
  }

  // 6. Detect seasonal patterns (same month in previous year)
  const prevMonthlyArray = Array.from(prevMonthly.entries());
  const currMonthlyArray = Array.from(currMonthly.entries());

  // 7. Calculate pattern
  const pattern = analyzePattern(prevMonthly, currMonthly, totalDelta, newTypeImpact, largestBookingAmount);

  // 8. Sort factors by impact and limit to top ones
  const positiveFactors = factors.filter((f) => f.impact > 0).sort((a, b) => b.impact - a.impact);
  const negativeFactors = factors.filter((f) => f.impact < 0).sort((a, b) => a.impact - b.impact);

  const topFactors = [...positiveFactors.slice(0, 2), ...negativeFactors.slice(0, 2)];

  // 9. Calculate confidence
  const explainedAmount = topFactors.reduce((sum, f) => sum + Math.abs(f.impact), 0);
  const confidence = calculateConfidence(explainedAmount, totalDelta, topFactors.length);

  // 10. Generate summary
  const mainFactor = topFactors[0];
  let summary = '';

  if (pattern === 'one-time') {
    summary = `Abweichung durch Einzelbuchung: ${mainFactor?.label || 'Einzelne große Buchung'}. Betrag: ${Math.abs(totalDelta).toLocaleString('de-DE')} EUR.`;
  } else if (pattern === 'structural') {
    summary = `Strukturelle Änderung: ${mainFactor?.label || 'Bestandteile haben sich wesentlich geändert'}. ${topFactors.length} Hauptfaktoren identifiziert.`;
  } else if (pattern === 'seasonal') {
    summary = `Saisonale Schwankung: ${mainFactor?.label || 'Typisches Saisonmuster'}. Betrag: ${Math.abs(totalDelta).toLocaleString('de-DE')} EUR.`;
  } else if (pattern === 'trend') {
    const direction = totalDelta > 0 ? 'steigender' : 'fallender';
    summary = `${direction.charAt(0).toUpperCase() + direction.slice(1)} Trend über Monate: ${mainFactor?.label || 'Konsistente Veränderung'}. Gesamt: ${Math.abs(totalDelta).toLocaleString('de-DE')} EUR.`;
  } else {
    summary = `Abweichung identifiziert: ${mainFactor?.label || 'Mehrere Faktoren'}. Betrag: ${Math.abs(totalDelta).toLocaleString('de-DE')} EUR.`;
  }

  return {
    summary,
    factors: topFactors.map((f) => ({
      label: f.label,
      impact: f.impact,
      type: f.type,
    })),
    topBookings: topBookingsForResponse,
    pattern,
    confidence,
  };
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const { deviation, prevBookings, currBookings } = body as {
      deviation: AccountDeviation;
      prevBookings: Booking[];
      currBookings: Booking[];
    };

    // Validate inputs
    if (!deviation) {
      return jsonError('Deviation ist erforderlich', 400, requestId);
    }

    if (!Array.isArray(prevBookings) || prevBookings.length === 0) {
      return jsonError('Vorjahr-Buchungen erforderlich und nicht leer', 400, requestId);
    }

    if (!Array.isArray(currBookings) || currBookings.length === 0) {
      return jsonError('Aktuelle Buchungen erforderlich und nicht leer', 400, requestId);
    }

    // Perform analysis
    const result = analyzeDeviation(deviation, prevBookings, currBookings);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Explain deviation error:', requestId, sanitizeError(error));
    return jsonError('Abweichungserklärung fehlgeschlagen', 500, requestId);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
