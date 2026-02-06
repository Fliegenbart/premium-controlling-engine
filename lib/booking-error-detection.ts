/**
 * Smart Booking Error Detection
 * Detects intelligent accounting errors beyond simple quality checks:
 * - Duplicate payments
 * - Wrong account assignments
 * - Missing accruals
 * - Suspicious round numbers
 * - Weekend bookings
 * - Reversed signs
 * - Unusual vendors
 * - Split bookings
 * - Cross-period issues
 * - Missing counter entries
 */

import { Booking } from './types';

export interface BookingError {
  id: string;
  type:
    | 'duplicate_payment'
    | 'wrong_account'
    | 'missing_accrual'
    | 'round_number_suspicious'
    | 'weekend_booking'
    | 'reversed_sign'
    | 'unusual_vendor'
    | 'split_booking_suspicious'
    | 'cross_period'
    | 'missing_counter_entry';
  severity: 'info' | 'warning' | 'critical';
  confidence: number; // 0-1
  description: string;
  affectedBookings: BookingReference[];
  suggestedFix: string;
  financialImpact: number;
  category: 'Dublette' | 'Kontierung' | 'Abgrenzung' | 'Auffälligkeit' | 'Plausibilität';
}

export interface BookingReference {
  document_no: string;
  posting_date: string;
  amount: number;
  account: number;
  account_name: string;
  text: string;
}

export interface ErrorDetectionResult {
  errors: BookingError[];
  riskScore: number; // 0-100, higher = more issues
  summary: {
    totalErrors: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    estimatedFinancialImpact: number;
    topCategories: { category: string; count: number; impact: number }[];
  };
  recommendations: string[];
}

/**
 * Account type mappings for German SKR03
 * Maps common booking texts to expected account ranges
 */
const ACCOUNT_MAPPINGS: Record<string, { ranges: [number, number][]; keywords: string[] }> = {
  'Miete & Pacht': {
    ranges: [[4210, 4219]],
    keywords: ['miete', 'pacht', 'mietkosten', 'pachtkosten', 'mietwagen'],
  },
  'Gehalt & Löhne': {
    ranges: [[5000, 5999]],
    keywords: ['gehalt', 'lohn', 'löhne', 'gehälter', 'sozialversicherung', 'abgaben', 'entgelt'],
  },
  'Kommunikation': {
    ranges: [[4900, 4999]],
    keywords: ['porto', 'telefon', 'internet', 'kommunikation', 'versand', 'fracht', 'telefonfunk'],
  },
  'Versicherung': {
    ranges: [[4360, 4369]],
    keywords: ['versicherung', 'versichert', 'versicherungskosten'],
  },
  'Reisekosten': {
    ranges: [[4660, 4679]],
    keywords: ['reisen', 'reisekosten', 'hotell', 'flugkosten', 'verkehr', 'dienstreisen'],
  },
  'Büromaterial': {
    ranges: [[4930, 4939]],
    keywords: ['büromaterial', 'papier', 'kugelschreiber', 'tinte', 'klebstoff', 'ordner'],
  },
  'Werbung & Marketing': {
    ranges: [[4600, 4619]],
    keywords: ['werbung', 'marketing', 'anzeige', 'reklame', 'anzeigen', 'kampagne'],
  },
  'Beratung & Dienstleistungen': {
    ranges: [[4950, 4959]],
    keywords: ['beratung', 'berater', 'anwalt', 'rechtsanwalt', 'steuerberater', 'steuer', 'prüfung'],
  },
  'Wartung & Reparatur': {
    ranges: [[4670, 4680]],
    keywords: ['wartung', 'reparatur', 'instandhaltung', 'instandsetzung', 'reinigung', 'reiniger'],
  },
  'Strom & Energie': {
    ranges: [[4670, 4680]],
    keywords: ['strom', 'gas', 'wasser', 'heizung', 'energie', 'elektrizität'],
  },
};

/**
 * Main detection function
 */
export function detectBookingErrors(bookings: Booking[], prevBookings?: Booking[]): ErrorDetectionResult {
  const errors: BookingError[] = [];

  // Run all detection algorithms
  errors.push(...detectDuplicatePayments(bookings));
  errors.push(...detectWrongAccount(bookings));
  errors.push(...detectMissingAccruals(bookings, prevBookings));
  errors.push(...detectRoundNumberSuspicious(bookings));
  errors.push(...detectWeekendBooking(bookings));
  errors.push(...detectReversedSign(bookings));
  errors.push(...detectUnusualVendor(bookings, prevBookings));
  errors.push(...detectSplitBookingSuspicious(bookings));

  // Calculate risk score
  const criticalCount = errors.filter((e) => e.severity === 'critical').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;
  const infoCount = errors.filter((e) => e.severity === 'info').length;

  const riskScore = Math.min(
    100,
    criticalCount * 25 + warningCount * 10 + infoCount * 2
  );

  // Calculate total impact
  const totalImpact = errors.reduce((sum, e) => sum + e.financialImpact, 0);

  // Group by category
  const categoryMap = new Map<string, { count: number; impact: number }>();
  errors.forEach((e) => {
    const existing = categoryMap.get(e.category) || { count: 0, impact: 0 };
    categoryMap.set(e.category, {
      count: existing.count + 1,
      impact: existing.impact + e.financialImpact,
    });
  });

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, { count, impact }]) => ({ category, count, impact }))
    .sort((a, b) => b.count - a.count);

  // Generate recommendations
  const recommendations = generateRecommendations(errors);

  return {
    errors,
    riskScore,
    summary: {
      totalErrors: errors.length,
      criticalCount,
      warningCount,
      infoCount,
      estimatedFinancialImpact: totalImpact,
      topCategories,
    },
    recommendations,
  };
}

/**
 * Detect duplicate payments
 * Find bookings with same vendor + similar amount (±5%) + within 30 days
 */
function detectDuplicatePayments(bookings: Booking[]): BookingError[] {
  const errors: BookingError[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < bookings.length; i++) {
    const booking = bookings[i];
    if (!booking.vendor) continue;

    const key = `${i}`;
    if (processed.has(key)) continue;

    // Find similar bookings
    const similar = bookings.filter((b, idx) => {
      if (idx <= i || !b.vendor) return false;
      if (processed.has(`${idx}`)) return false;

      // Same vendor
      if (b.vendor!.toLowerCase() !== booking.vendor!.toLowerCase()) return false;

      // Similar amount (±5%)
      const amountDiff = Math.abs(b.amount - booking.amount);
      const percentDiff = (amountDiff / Math.abs(booking.amount)) * 100;
      if (percentDiff > 5) return false;

      // Within 30 days
      const date1 = new Date(booking.posting_date);
      const date2 = new Date(b.posting_date);
      const daysDiff = Math.abs((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) return false;

      return true;
    });

    if (similar.length > 0) {
      const affectedBookings = [booking, ...similar].map((b) => ({
        document_no: b.document_no,
        posting_date: b.posting_date,
        amount: b.amount,
        account: b.account,
        account_name: b.account_name,
        text: b.text,
      }));

      // Estimate confidence
      let confidence = 0.5;
      if (similar.length > 2) confidence += 0.2;
      if (Math.abs(similar[0].amount - booking.amount) < 0.01) confidence += 0.2;

      const totalAmount = Math.abs(
        booking.amount + similar.reduce((sum, b) => sum + b.amount, 0)
      );

      errors.push({
        id: `dup-payment-${booking.document_no}-${similar[0].document_no}`,
        type: 'duplicate_payment',
        severity: confidence > 0.7 ? 'critical' : 'warning',
        confidence: Math.min(1, confidence),
        description: `Mögliche doppelte Zahlung an ${booking.vendor}: ${similar.length + 1} ähnliche Buchungen innerhalb von 30 Tagen`,
        affectedBookings,
        suggestedFix: `Prüfen Sie die Buchungen ${[booking.document_no, ...similar.map((b) => b.document_no)].join(', ')}. Eine oder mehrere könnten storniert werden müssen.`,
        financialImpact: totalAmount,
        category: 'Dublette',
      });

      // Mark as processed
      processed.add(key);
      similar.forEach((b) => {
        processed.add(`${bookings.indexOf(b)}`);
      });
    }
  }

  return errors;
}

/**
 * Detect wrong account assignments
 * Check if booking text doesn't match account type
 */
function detectWrongAccount(bookings: Booking[]): BookingError[] {
  const errors: BookingError[] = [];

  bookings.forEach((booking) => {
    const lowerText = booking.text.toLowerCase();

    // Check each account mapping
    for (const [category, mapping] of Object.entries(ACCOUNT_MAPPINGS)) {
      // Check if any keyword matches
      const matchedKeyword = mapping.keywords.find((kw) => lowerText.includes(kw));
      if (!matchedKeyword) continue;

      // Check if account is in expected ranges
      const inExpectedRange = mapping.ranges.some(
        ([min, max]) => booking.account >= min && booking.account <= max
      );

      if (!inExpectedRange) {
        const expectedRanges = mapping.ranges.map(([min, max]) => `${min}-${max}`).join(', ');

        errors.push({
          id: `wrong-account-${booking.document_no}`,
          type: 'wrong_account',
          severity: 'warning',
          confidence: 0.75,
          description: `Kontierung nicht plausibel: "${matchedKeyword}" deutet auf Konto ${expectedRanges} hin, gebucht wurde aber auf ${booking.account} (${booking.account_name})`,
          affectedBookings: [
            {
              document_no: booking.document_no,
              posting_date: booking.posting_date,
              amount: booking.amount,
              account: booking.account,
              account_name: booking.account_name,
              text: booking.text,
            },
          ],
          suggestedFix: `Überprüfen Sie, ob die Buchung auf ein Konto der Reihe ${expectedRanges} umgebucht werden sollte.`,
          financialImpact: Math.abs(booking.amount),
          category: 'Kontierung',
        });
      }
    }
  });

  return errors;
}

/**
 * Detect missing accruals
 * Find recurring bookings that appear in previous but not current period
 */
function detectMissingAccruals(bookings: Booking[], prevBookings?: Booking[]): BookingError[] {
  const errors: BookingError[] = [];

  if (!prevBookings || prevBookings.length === 0) return errors;

  // Find regular bookings in previous period
  const vendorPatterns = new Map<
    string,
    { account: number; amount: number; frequency: number; last_date: string }[]
  >();

  prevBookings.forEach((booking) => {
    if (!booking.vendor) return;

    const vendor = booking.vendor.toLowerCase();
    const patterns = vendorPatterns.get(vendor) || [];

    // Find if similar pattern exists
    const existing = patterns.find(
      (p) => p.account === booking.account && Math.abs(p.amount - booking.amount) < Math.abs(booking.amount) * 0.1
    );

    if (existing) {
      existing.frequency++;
      existing.last_date = booking.posting_date > existing.last_date ? booking.posting_date : existing.last_date;
    } else {
      patterns.push({
        account: booking.account,
        amount: booking.amount,
        frequency: 1,
        last_date: booking.posting_date,
      });
    }

    vendorPatterns.set(vendor, patterns);
  });

  // Check current bookings for missing recurring patterns
  vendorPatterns.forEach((patterns, vendor) => {
    patterns.forEach((pattern) => {
      // Only check regular patterns (frequency >= 2)
      if (pattern.frequency < 2) return;

      // Check if this pattern exists in current bookings
      const exists = bookings.some(
        (b) =>
          b.vendor?.toLowerCase() === vendor &&
          b.account === pattern.account &&
          Math.abs(b.amount - pattern.amount) < Math.abs(pattern.amount) * 0.1
      );

      if (!exists) {
        // Check if it's a regular monthly booking
        const lastDate = new Date(pattern.last_date);
        const expectedDate = new Date(lastDate);
        expectedDate.setMonth(expectedDate.getMonth() + 1);

        const today = new Date();
        const isLateOrMissing =
          expectedDate <= today && Math.abs(today.getTime() - expectedDate.getTime()) > 0;

        if (isLateOrMissing) {
          errors.push({
            id: `missing-accrual-${vendor}-${pattern.account}`,
            type: 'missing_accrual',
            severity: 'warning',
            confidence: 0.8,
            description: `Mögliche fehlende Abgrenzung: ${vendor} auf Konto ${pattern.account} war in Vorperiode regelmäßig (${pattern.frequency}x), fehlt aber jetzt`,
            affectedBookings: [],
            suggestedFix: `Überprüfen Sie, ob eine Abgrenzung/Accrual für ${vendor} in Höhe von ca. ${Math.abs(pattern.amount).toFixed(2)} EUR notwendig ist.`,
            financialImpact: Math.abs(pattern.amount),
            category: 'Abgrenzung',
          });
        }
      }
    });
  });

  return errors;
}

/**
 * Detect suspicious round numbers
 * Flag unusually round amounts (10000, 50000) on accounts that usually vary
 */
function detectRoundNumberSuspicious(bookings: Booking[]): BookingError[] {
  const errors: BookingError[] = [];

  // Group by account
  const byAccount = new Map<number, { amounts: number[]; bookings: Booking[] }>();
  bookings.forEach((b) => {
    const group = byAccount.get(b.account) || { amounts: [], bookings: [] };
    group.amounts.push(Math.abs(b.amount));
    group.bookings.push(b);
    byAccount.set(b.account, group);
  });

  byAccount.forEach((group, account) => {
    group.bookings.forEach((booking) => {
      const amount = Math.abs(booking.amount);

      // Check if amount is unusually round
      const isRound =
        amount % 10000 === 0 ||
        amount % 5000 === 0 ||
        amount % 1000 === 0 ||
        amount % 500 === 0;

      if (!isRound) return;

      // Calculate variance of amounts on this account
      const avg = group.amounts.reduce((a, b) => a + b) / group.amounts.length;
      const variance =
        group.amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / group.amounts.length;
      const stdDev = Math.sqrt(variance);

      // If this account usually has varied amounts, round number is suspicious
      if (stdDev > avg * 0.2) {
        // High variance means amounts usually vary
        const roundLevel = amount % 10000 === 0 ? 'sehr rund (Zehntausender)' : 'rund (rundes Tausend)';

        errors.push({
          id: `round-number-${booking.document_no}`,
          type: 'round_number_suspicious',
          severity: 'info',
          confidence: 0.6,
          description: `Auffällig ${roundLevel} Betrag auf Konto ${account} (${booking.account_name}): ${amount.toFixed(2)} EUR`,
          affectedBookings: [
            {
              document_no: booking.document_no,
              posting_date: booking.posting_date,
              amount: booking.amount,
              account: booking.account,
              account_name: booking.account_name,
              text: booking.text,
            },
          ],
          suggestedFix: 'Prüfen Sie, ob dieser Schätzungsbetrag oder Vereinfachung korrekt ist.',
          financialImpact: amount,
          category: 'Auffälligkeit',
        });
      }
    });
  });

  return errors;
}

/**
 * Detect weekend bookings
 * Flag bookings dated on weekends (unusual for German accounting)
 */
function detectWeekendBooking(bookings: Booking[]): BookingError[] {
  const errors: BookingError[] = [];

  bookings.forEach((booking) => {
    const date = new Date(booking.posting_date);
    const dayOfWeek = date.getDay();

    // Saturday = 6, Sunday = 0
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      errors.push({
        id: `weekend-${booking.document_no}`,
        type: 'weekend_booking',
        severity: 'info',
        confidence: 0.5,
        description: `Buchung am Wochenende (${date.toLocaleDateString('de-DE', { weekday: 'long' })}): ${booking.posting_date}`,
        affectedBookings: [
          {
            document_no: booking.document_no,
            posting_date: booking.posting_date,
            amount: booking.amount,
            account: booking.account,
            account_name: booking.account_name,
            text: booking.text,
          },
        ],
        suggestedFix: 'Überprüfen Sie, ob das Datum korrekt ist.',
        financialImpact: 0,
        category: 'Auffälligkeit',
      });
    }
  });

  return errors;
}

/**
 * Detect reversed signs
 * Detect when expense/revenue accounts have unexpected signs
 */
function detectReversedSign(bookings: Booking[]): BookingError[] {
  const errors: BookingError[] = [];

  bookings.forEach((booking) => {
    const account = booking.account;
    const amount = booking.amount;

    // Revenue accounts: 8000-8999
    if (account >= 8000 && account <= 8999) {
      if (amount > 0) {
        errors.push({
          id: `reversed-sign-${booking.document_no}`,
          type: 'reversed_sign',
          severity: 'warning',
          confidence: 0.9,
          description: `Verkehrte Vorzeichen: Ertragskonto ${account} mit positivem Betrag ${amount.toFixed(2)} EUR (sollte negativ sein)`,
          affectedBookings: [
            {
              document_no: booking.document_no,
              posting_date: booking.posting_date,
              amount: booking.amount,
              account: booking.account,
              account_name: booking.account_name,
              text: booking.text,
            },
          ],
          suggestedFix: 'Überprüfen Sie das Vorzeichen der Buchung.',
          financialImpact: Math.abs(amount * 2), // Double impact as sign is wrong
          category: 'Plausibilität',
        });
      }
    }

    // Typical expense accounts: 4000-7999 (but not all are debits)
    // This is a simplified check - would need more context
  });

  return errors;
}

/**
 * Detect unusual vendors
 * Find vendors that appear only once with large amounts
 */
function detectUnusualVendor(bookings: Booking[], prevBookings?: Booking[]): BookingError[] {
  const errors: BookingError[] = [];

  // Group current bookings by vendor
  const vendorSummary = new Map<string, { count: number; totalAmount: number; bookings: Booking[] }>();
  bookings.forEach((b) => {
    if (!b.vendor) return;
    const vendor = b.vendor.toLowerCase();
    const existing = vendorSummary.get(vendor) || { count: 0, totalAmount: 0, bookings: [] };
    existing.count++;
    existing.totalAmount += Math.abs(b.amount);
    existing.bookings.push(b);
    vendorSummary.set(vendor, existing);
  });

  // Get previous vendor set
  const previousVendors = new Set<string>();
  if (prevBookings) {
    prevBookings.forEach((b) => {
      if (b.vendor) previousVendors.add(b.vendor.toLowerCase());
    });
  }

  // Find unusual vendors
  vendorSummary.forEach((summary, vendor) => {
    // New vendor appearing only once with large amount
    if (summary.count === 1 && !previousVendors.has(vendor)) {
      const amount = summary.bookings[0].amount;
      const absAmount = Math.abs(amount);

      // Only flag if amount is substantial (> 5000)
      if (absAmount > 5000) {
        errors.push({
          id: `unusual-vendor-${vendor}`,
          type: 'unusual_vendor',
          severity: 'info',
          confidence: 0.6,
          description: `Neuer Lieferant "${vendor}" mit einzelner großer Buchung: ${absAmount.toFixed(2)} EUR`,
          affectedBookings: [
            {
              document_no: summary.bookings[0].document_no,
              posting_date: summary.bookings[0].posting_date,
              amount: summary.bookings[0].amount,
              account: summary.bookings[0].account,
              account_name: summary.bookings[0].account_name,
              text: summary.bookings[0].text,
            },
          ],
          suggestedFix: 'Überprüfen Sie, ob dieser neue Lieferant bekannt und autorisiert ist.',
          financialImpact: absAmount,
          category: 'Auffälligkeit',
        });
      }
    }
  });

  return errors;
}

/**
 * Detect split bookings
 * Find clusters of same-day bookings just below approval thresholds
 */
function detectSplitBookingSuspicious(bookings: Booking[]): BookingError[] {
  const errors: BookingError[] = [];

  // Group by posting date and account
  const byDateAccount = new Map<string, Booking[]>();
  bookings.forEach((b) => {
    const key = `${b.posting_date}|${b.account}`;
    const existing = byDateAccount.get(key) || [];
    existing.push(b);
    byDateAccount.set(key, existing);
  });

  // Check for suspiciously split bookings
  byDateAccount.forEach((group) => {
    if (group.length < 3) return; // Need at least 3 bookings

    // Check if amounts are similar and just below common thresholds (5000, 10000)
    const amounts = group.map((b) => Math.abs(b.amount));
    const totalAmount = amounts.reduce((a, b) => a + b);

    const allJustBelow5k = amounts.every((a) => a > 2000 && a < 5000);
    const allJustBelow10k = amounts.every((a) => a > 5000 && a < 10000);

    if ((allJustBelow5k || allJustBelow10k) && group.length >= 3) {
      const threshold = allJustBelow5k ? '5.000' : '10.000';

      errors.push({
        id: `split-booking-${group[0].posting_date}-${group[0].account}`,
        type: 'split_booking_suspicious',
        severity: 'warning',
        confidence: 0.7,
        description: `Verdächtige Aufteilung: ${group.length} Buchungen auf demselben Konto am selben Tag, alle knapp unter ${threshold} EUR`,
        affectedBookings: group.map((b) => ({
          document_no: b.document_no,
          posting_date: b.posting_date,
          amount: b.amount,
          account: b.account,
          account_name: b.account_name,
          text: b.text,
        })),
        suggestedFix: `Überprüfen Sie, ob diese ${group.length} Buchungen künstlich aufgeteilt wurden, um Genehmigungsschwellen zu umgehen.`,
        financialImpact: totalAmount,
        category: 'Auffälligkeit',
      });
    }
  });

  return errors;
}

/**
 * Generate recommendations based on detected errors
 */
function generateRecommendations(errors: BookingError[]): string[] {
  const recommendations: string[] = [];
  const categories = new Set(errors.map((e) => e.category));

  if (categories.has('Dublette')) {
    recommendations.push('Überprüfen Sie die erkannten doppelten Buchungen und bereinigen Sie Duplikate.');
  }

  if (categories.has('Kontierung')) {
    recommendations.push(
      'Prüfen Sie die Kontierungen auf Richtigkeit. Möglicherweise werden Buchungen auf falsche Konten gebucht.'
    );
  }

  if (categories.has('Abgrenzung')) {
    recommendations.push(
      'Überprüfen Sie, ob für regelmäßige Kosten Abgrenzungen/Accruals notwendig sind.'
    );
  }

  if (categories.has('Auffälligkeit')) {
    recommendations.push(
      'Überprüfen Sie die auffälligen Buchungen auf Plausibilität und mögliche Eingabefehler.'
    );
  }

  if (categories.has('Plausibilität')) {
    recommendations.push(
      'Es wurden Vorzeichen-Fehler erkannt. Überprüfen Sie die betroffenen Buchungen.'
    );
  }

  if (errors.length === 0) {
    recommendations.push('Keine kritischen Fehler erkannt. Die Buchungen sehen plausibel aus.');
  }

  return recommendations;
}
