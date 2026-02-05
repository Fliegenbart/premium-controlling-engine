/**
 * Data Quality Checks Module
 * Detects duplicates, gaps, anomalies and data issues
 */

import { Booking, DataProfile } from './types';

export interface QualityIssue {
  id: string;
  type: 'duplicate' | 'gap' | 'outlier' | 'missing_value' | 'format_error' | 'balance_error';
  severity: 'info' | 'warning' | 'error';
  description: string;
  affectedRecords: number;
  details: Record<string, unknown>;
  suggestion?: string;
}

export interface QualityReport {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: QualityIssue[];
  summary: {
    totalRecords: number;
    duplicates: number;
    gaps: number;
    outliers: number;
    missingValues: number;
    formatErrors: number;
  };
  checks: QualityCheck[];
}

export interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  message: string;
}

/**
 * Run comprehensive quality checks on booking data
 */
export function runQualityChecks(bookings: Booking[]): QualityReport {
  const issues: QualityIssue[] = [];
  const checks: QualityCheck[] = [];

  // 1. Check for duplicates
  const duplicateResult = checkDuplicates(bookings);
  issues.push(...duplicateResult.issues);
  checks.push(duplicateResult.check);

  // 2. Check for date gaps
  const gapResult = checkDateGaps(bookings);
  issues.push(...gapResult.issues);
  checks.push(gapResult.check);

  // 3. Check for outliers
  const outlierResult = checkOutliers(bookings);
  issues.push(...outlierResult.issues);
  checks.push(outlierResult.check);

  // 4. Check for missing values
  const missingResult = checkMissingValues(bookings);
  issues.push(...missingResult.issues);
  checks.push(missingResult.check);

  // 5. Check account numbers
  const accountResult = checkAccountNumbers(bookings);
  issues.push(...accountResult.issues);
  checks.push(accountResult.check);

  // 6. Check balance (Soll = Haben for journal entries)
  const balanceResult = checkBalance(bookings);
  issues.push(...balanceResult.issues);
  checks.push(balanceResult.check);

  // Calculate overall score
  const totalWeight = checks.length;
  const weightedScore = checks.reduce((sum, c) => sum + c.score, 0) / totalWeight;
  const score = Math.round(weightedScore);

  // Determine grade
  let grade: QualityReport['grade'];
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return {
    score,
    grade,
    issues,
    summary: {
      totalRecords: bookings.length,
      duplicates: issues.filter(i => i.type === 'duplicate').reduce((s, i) => s + i.affectedRecords, 0),
      gaps: issues.filter(i => i.type === 'gap').length,
      outliers: issues.filter(i => i.type === 'outlier').reduce((s, i) => s + i.affectedRecords, 0),
      missingValues: issues.filter(i => i.type === 'missing_value').reduce((s, i) => s + i.affectedRecords, 0),
      formatErrors: issues.filter(i => i.type === 'format_error').reduce((s, i) => s + i.affectedRecords, 0)
    },
    checks
  };
}

/**
 * Check for duplicate bookings
 */
function checkDuplicates(bookings: Booking[]): { issues: QualityIssue[]; check: QualityCheck } {
  const issues: QualityIssue[] = [];

  // Group by document_no
  const byDocNo = new Map<string, Booking[]>();
  bookings.forEach(b => {
    const existing = byDocNo.get(b.document_no) || [];
    existing.push(b);
    byDocNo.set(b.document_no, existing);
  });

  // Find duplicates
  const duplicates: string[] = [];
  byDocNo.forEach((group, docNo) => {
    if (group.length > 1) {
      duplicates.push(docNo);
    }
  });

  if (duplicates.length > 0) {
    issues.push({
      id: 'dup-docno',
      type: 'duplicate',
      severity: 'warning',
      description: `${duplicates.length} Belegnummern mehrfach vorhanden`,
      affectedRecords: duplicates.reduce((s, d) => s + (byDocNo.get(d)?.length || 0), 0),
      details: { documentNumbers: duplicates.slice(0, 10) },
      suggestion: 'Prüfen Sie, ob es sich um echte Duplikate handelt oder verschiedene Buchungszeilen zum selben Beleg.'
    });
  }

  // Check for exact duplicates (same date, amount, account)
  const exactDupKey = (b: Booking) => `${b.posting_date}|${b.amount}|${b.account}|${b.text}`;
  const exactGroups = new Map<string, Booking[]>();
  bookings.forEach(b => {
    const key = exactDupKey(b);
    const existing = exactGroups.get(key) || [];
    existing.push(b);
    exactGroups.set(key, existing);
  });

  const exactDuplicates = Array.from(exactGroups.values()).filter(g => g.length > 1);
  if (exactDuplicates.length > 0) {
    issues.push({
      id: 'dup-exact',
      type: 'duplicate',
      severity: 'error',
      description: `${exactDuplicates.length} exakte Duplikate gefunden`,
      affectedRecords: exactDuplicates.reduce((s, g) => s + g.length, 0),
      details: { count: exactDuplicates.length },
      suggestion: 'Exakte Duplikate sollten entfernt werden.'
    });
  }

  const duplicateCount = duplicates.length + exactDuplicates.length;
  const score = duplicateCount === 0 ? 100 : Math.max(0, 100 - duplicateCount * 5);

  return {
    issues,
    check: {
      name: 'Duplikat-Prüfung',
      passed: duplicateCount === 0,
      score,
      message: duplicateCount === 0
        ? 'Keine Duplikate gefunden'
        : `${duplicateCount} potenzielle Duplikate`
    }
  };
}

/**
 * Check for date gaps
 */
function checkDateGaps(bookings: Booking[]): { issues: QualityIssue[]; check: QualityCheck } {
  const issues: QualityIssue[] = [];

  if (bookings.length === 0) {
    return {
      issues,
      check: { name: 'Datumslücken', passed: true, score: 100, message: 'Keine Daten' }
    };
  }

  // Get unique months
  const months = new Set<string>();
  bookings.forEach(b => {
    if (b.posting_date) {
      months.add(b.posting_date.substring(0, 7)); // YYYY-MM
    }
  });

  const sortedMonths = Array.from(months).sort();

  // Check for gaps
  const gaps: string[] = [];
  for (let i = 1; i < sortedMonths.length; i++) {
    const prev = new Date(sortedMonths[i - 1] + '-01');
    const curr = new Date(sortedMonths[i] + '-01');

    const monthDiff = (curr.getFullYear() - prev.getFullYear()) * 12 +
      (curr.getMonth() - prev.getMonth());

    if (monthDiff > 1) {
      // Gap found
      for (let j = 1; j < monthDiff; j++) {
        const gapMonth = new Date(prev);
        gapMonth.setMonth(gapMonth.getMonth() + j);
        gaps.push(gapMonth.toISOString().substring(0, 7));
      }
    }
  }

  if (gaps.length > 0) {
    issues.push({
      id: 'gap-months',
      type: 'gap',
      severity: 'warning',
      description: `${gaps.length} Monate ohne Buchungen`,
      affectedRecords: 0,
      details: { missingMonths: gaps },
      suggestion: 'Prüfen Sie, ob für diese Monate Buchungen fehlen.'
    });
  }

  const score = gaps.length === 0 ? 100 : Math.max(0, 100 - gaps.length * 10);

  return {
    issues,
    check: {
      name: 'Datumslücken',
      passed: gaps.length === 0,
      score,
      message: gaps.length === 0
        ? 'Keine Datumslücken'
        : `${gaps.length} Monate ohne Daten`
    }
  };
}

/**
 * Check for outliers using IQR method
 */
function checkOutliers(bookings: Booking[]): { issues: QualityIssue[]; check: QualityCheck } {
  const issues: QualityIssue[] = [];

  // Group by account
  const byAccount = new Map<number, number[]>();
  bookings.forEach(b => {
    const amounts = byAccount.get(b.account) || [];
    amounts.push(Math.abs(b.amount));
    byAccount.set(b.account, amounts);
  });

  const outlierBookings: { account: number; amount: number; threshold: number }[] = [];

  byAccount.forEach((amounts, account) => {
    if (amounts.length < 5) return; // Need enough data

    // Sort and calculate IQR
    const sorted = [...amounts].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const upperBound = q3 + 3 * iqr; // Using 3x IQR for extreme outliers

    // Find outliers
    amounts.forEach(amt => {
      if (amt > upperBound && upperBound > 0) {
        outlierBookings.push({ account, amount: amt, threshold: upperBound });
      }
    });
  });

  if (outlierBookings.length > 0) {
    issues.push({
      id: 'outliers',
      type: 'outlier',
      severity: 'info',
      description: `${outlierBookings.length} statistische Ausreißer gefunden`,
      affectedRecords: outlierBookings.length,
      details: { examples: outlierBookings.slice(0, 5) },
      suggestion: 'Ausreißer können auf Sondereffekte oder Eingabefehler hindeuten.'
    });
  }

  const outlierRate = bookings.length > 0 ? outlierBookings.length / bookings.length : 0;
  const score = Math.max(0, 100 - outlierRate * 500);

  return {
    issues,
    check: {
      name: 'Ausreißer-Analyse',
      passed: outlierRate < 0.05,
      score,
      message: outlierBookings.length === 0
        ? 'Keine extremen Ausreißer'
        : `${outlierBookings.length} Ausreißer (${(outlierRate * 100).toFixed(1)}%)`
    }
  };
}

/**
 * Check for missing values
 */
function checkMissingValues(bookings: Booking[]): { issues: QualityIssue[]; check: QualityCheck } {
  const issues: QualityIssue[] = [];

  let missingDates = 0;
  let missingAccounts = 0;
  let missingAmounts = 0;
  let missingDocNo = 0;

  bookings.forEach(b => {
    if (!b.posting_date) missingDates++;
    if (!b.account) missingAccounts++;
    if (b.amount === null || b.amount === undefined) missingAmounts++;
    if (!b.document_no) missingDocNo++;
  });

  if (missingDates > 0) {
    issues.push({
      id: 'missing-date',
      type: 'missing_value',
      severity: 'error',
      description: `${missingDates} Buchungen ohne Datum`,
      affectedRecords: missingDates,
      details: { field: 'posting_date' }
    });
  }

  if (missingAccounts > 0) {
    issues.push({
      id: 'missing-account',
      type: 'missing_value',
      severity: 'error',
      description: `${missingAccounts} Buchungen ohne Konto`,
      affectedRecords: missingAccounts,
      details: { field: 'account' }
    });
  }

  if (missingAmounts > 0) {
    issues.push({
      id: 'missing-amount',
      type: 'missing_value',
      severity: 'error',
      description: `${missingAmounts} Buchungen ohne Betrag`,
      affectedRecords: missingAmounts,
      details: { field: 'amount' }
    });
  }

  const totalMissing = missingDates + missingAccounts + missingAmounts;
  const missingRate = bookings.length > 0 ? totalMissing / (bookings.length * 3) : 0;
  const score = Math.max(0, 100 - missingRate * 500);

  return {
    issues,
    check: {
      name: 'Vollständigkeit',
      passed: totalMissing === 0,
      score,
      message: totalMissing === 0
        ? 'Alle Pflichtfelder gefüllt'
        : `${totalMissing} fehlende Pflichtfelder`
    }
  };
}

/**
 * Check account number validity
 */
function checkAccountNumbers(bookings: Booking[]): { issues: QualityIssue[]; check: QualityCheck } {
  const issues: QualityIssue[] = [];

  // SKR03 account ranges
  const validRanges = [
    { min: 0, max: 999, name: 'Anlagevermögen' },
    { min: 1000, max: 1999, name: 'Finanzanlagen' },
    { min: 2000, max: 2999, name: 'Umlaufvermögen' },
    { min: 3000, max: 3999, name: 'Wareneinkauf' },
    { min: 4000, max: 4999, name: 'Betriebliche Aufwendungen' },
    { min: 5000, max: 5999, name: 'Personalaufwand' },
    { min: 6000, max: 6999, name: 'Sonstige Aufwendungen' },
    { min: 7000, max: 7999, name: 'Abschreibungen/Zinsen' },
    { min: 8000, max: 8999, name: 'Erlöse' },
    { min: 9000, max: 9999, name: 'Statistik/Sonderkonten' },
  ];

  const invalidAccounts: number[] = [];
  bookings.forEach(b => {
    if (!validRanges.some(r => b.account >= r.min && b.account <= r.max)) {
      if (!invalidAccounts.includes(b.account)) {
        invalidAccounts.push(b.account);
      }
    }
  });

  if (invalidAccounts.length > 0) {
    issues.push({
      id: 'invalid-accounts',
      type: 'format_error',
      severity: 'warning',
      description: `${invalidAccounts.length} ungültige Kontonummern (nicht SKR03)`,
      affectedRecords: bookings.filter(b => invalidAccounts.includes(b.account)).length,
      details: { accounts: invalidAccounts.slice(0, 10) },
      suggestion: 'Prüfen Sie die Kontonummern auf Tippfehler oder verwenden Sie einen anderen Kontenrahmen.'
    });
  }

  const score = invalidAccounts.length === 0 ? 100 : Math.max(0, 100 - invalidAccounts.length * 5);

  return {
    issues,
    check: {
      name: 'Kontonummern',
      passed: invalidAccounts.length === 0,
      score,
      message: invalidAccounts.length === 0
        ? 'Alle Kontonummern gültig'
        : `${invalidAccounts.length} unbekannte Konten`
    }
  };
}

/**
 * Check if debits equal credits (balance check)
 */
function checkBalance(bookings: Booking[]): { issues: QualityIssue[]; check: QualityCheck } {
  const issues: QualityIssue[] = [];

  const totalSum = bookings.reduce((sum, b) => sum + b.amount, 0);
  const isBalanced = Math.abs(totalSum) < 0.01; // Allow tiny rounding errors

  if (!isBalanced) {
    issues.push({
      id: 'balance-error',
      type: 'balance_error',
      severity: 'info',
      description: `Gesamtsumme nicht ausgeglichen: ${totalSum.toFixed(2)} EUR`,
      affectedRecords: bookings.length,
      details: { totalSum },
      suggestion: 'Für eine GuV/Summen-Liste ist dies normal. Bei Journal-Buchungen sollte die Summe 0 sein.'
    });
  }

  return {
    issues,
    check: {
      name: 'Summenprüfung',
      passed: true, // Don't fail on this, as unbalanced is normal for reports
      score: 100,
      message: isBalanced
        ? 'Summe ausgeglichen'
        : `Gesamtsumme: ${totalSum.toFixed(2)} EUR`
    }
  };
}
