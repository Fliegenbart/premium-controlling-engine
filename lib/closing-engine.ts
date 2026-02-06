import { ClosingCheck, ClosingWorkflow, CheckResult, CheckStatus, DEFAULT_CHECKS, getMonthLabel, getCurrentMonth } from './closing-types';
import { Booking } from './types';

function scoreToStatus(score: number): CheckStatus {
  if (score >= 80) return 'passed';
  if (score >= 50) return 'warning';
  return 'failed';
}

export function createClosingWorkflow(month?: string): ClosingWorkflow {
  const workflowMonth = month || getCurrentMonth();
  const checks = DEFAULT_CHECKS.map(check => ({
    ...check,
    status: 'pending' as const,
    result: undefined,
    executedAt: undefined,
  }));

  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    month: workflowMonth,
    monthLabel: getMonthLabel(workflowMonth),
    status: 'open',
    progress: 0,
    checks,
    startedAt: new Date().toISOString(),
    completedAt: undefined,
    notes: '',
  };
}

export function runCheck(check: ClosingCheck, currBookings: Booking[], prevBookings: Booking[]): ClosingCheck {
  const updatedCheck = { ...check, status: 'running' as const, executedAt: new Date().toISOString() };

  switch (check.id) {
    case 'bank-reconciliation':
      return runBankReconciliation(updatedCheck, currBookings);

    case 'debtor-reconciliation':
      return runDebtorReconciliation(updatedCheck, currBookings);

    case 'creditor-reconciliation':
      return runCreditorReconciliation(updatedCheck, currBookings);

    case 'provisions-booked':
      return runProvisionsBooked(updatedCheck, currBookings, prevBookings);

    case 'period-accruals':
      return runPeriodAccruals(updatedCheck, currBookings);

    case 'recurring-costs-complete':
      return runRecurringCostsComplete(updatedCheck, currBookings, prevBookings);

    case 'error-scan':
      return runErrorScan(updatedCheck, currBookings);

    case 'unusual-bookings':
      return runUnusualBookings(updatedCheck, currBookings);

    case 'reversal-check':
      return runReversalCheck(updatedCheck, currBookings);

    case 'all-accounts-active':
      return runAllAccountsActive(updatedCheck, currBookings, prevBookings);

    case 'volume-plausible':
      return runVolumePlausible(updatedCheck, currBookings, prevBookings);

    case 'manual-approval':
      return { ...updatedCheck, status: 'pending' as const, executedAt: undefined };

    default:
      return { ...updatedCheck, status: 'passed' as const };
  }
}

function runBankReconciliation(check: ClosingCheck, currBookings: Booking[]): ClosingCheck {
  const bankBookings = currBookings.filter(b => {
    const acc = b.account;
    return acc >= 1200 && acc <= 1299;
  });

  const totalBalance = bankBookings.reduce((sum, b) => sum + b.amount, 0);
  let score = 100;
  let passed = true;

  if (totalBalance < 0) {
    if (totalBalance > -50000) {
      score = 50;
      passed = true;
    } else {
      score = 0;
      passed = false;
    }
  }

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: [`Bankkonten-Saldo: ${totalBalance.toFixed(2)} EUR`],
    } as CheckResult,
  };
}

function runDebtorReconciliation(check: ClosingCheck, currBookings: Booking[]): ClosingCheck {
  const debtorBookings = currBookings.filter(b => {
    const acc = b.account;
    return acc >= 1400 && acc <= 1499;
  });

  const revenueBookings = currBookings.filter(b => {
    const acc = b.account;
    return acc >= 8000 && acc <= 8999;
  });

  const debtorSum = Math.abs(debtorBookings.reduce((sum, b) => sum + b.amount, 0));
  const revenueSum = Math.abs(revenueBookings.reduce((sum, b) => sum + b.amount, 0));

  const ratio = revenueSum > 0 ? debtorSum / revenueSum : 0;
  const passed = ratio >= 0.05 && ratio <= 0.5;
  const score = passed ? 100 : 50;

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: [`Debitor-/Umsatz-Verhältnis: ${ratio.toFixed(2)}`],
    } as CheckResult,
  };
}

function runCreditorReconciliation(check: ClosingCheck, currBookings: Booking[]): ClosingCheck {
  const creditorBookings = currBookings.filter(b => {
    const acc = b.account;
    return acc >= 3300 && acc <= 3399;
  });

  const expenseBookings = currBookings.filter(b => {
    const acc = b.account;
    return acc >= 5000 && acc <= 6999;
  });

  const creditorSum = Math.abs(creditorBookings.reduce((sum, b) => sum + b.amount, 0));
  const expenseSum = Math.abs(expenseBookings.reduce((sum, b) => sum + b.amount, 0));

  const ratio = expenseSum > 0 ? creditorSum / expenseSum : 0;
  const passed = ratio >= 0.05 && ratio <= 0.5;
  const score = passed ? 100 : 50;

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: [`Kreditor-/Kosten-Verhältnis: ${ratio.toFixed(2)}`],
    } as CheckResult,
  };
}

function runProvisionsBooked(check: ClosingCheck, currBookings: Booking[], prevBookings: Booking[]): ClosingCheck {
  const currProvisionsCount = currBookings.filter(b => {
    const acc = b.account;
    return acc >= 3000 && acc <= 3099;
  }).length;

  const prevProvisionsCount = prevBookings.filter(b => {
    const acc = b.account;
    return acc >= 3000 && acc <= 3099;
  }).length;

  const passed = currProvisionsCount > 0 && prevProvisionsCount > 0;
  const hasWarning = prevProvisionsCount > 0 && currProvisionsCount === 0;
  const score = passed ? 100 : hasWarning ? 50 : 0;

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: hasWarning
        ? ['Warnung: Rückstellungen in der Vorperiode vorhanden, aber keine in dieser Periode']
        : [`Rückstellungen erfasst: ${currProvisionsCount} Buchungen`],
    } as CheckResult,
  };
}

function runPeriodAccruals(check: ClosingCheck, currBookings: Booking[]): ClosingCheck {
  if (currBookings.length === 0) {
    return {
      ...check,
      status: scoreToStatus(100),
      result: { passed: true, score: 100, findings: ['Keine Buchungen vorhanden'] } as CheckResult,
    };
  }

  const crossPeriodCount = currBookings.filter(b => {
    if (!b.posting_date) return false;
    const date = new Date(b.posting_date);
    const month = date.getMonth() + 1;
    const currMonth = parseInt(getCurrentMonth().split('-')[1]);
    return month !== currMonth;
  }).length;

  const percentage = (crossPeriodCount / currBookings.length) * 100;
  let passed = true;
  let score = 100;
  if (percentage > 10) {
    passed = false;
    score = 0;
  } else if (percentage >= 5) {
    score = 60;
  }

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: [`Periodenfremd Buchungen: ${percentage.toFixed(1)}%`],
    } as CheckResult,
  };
}

function runRecurringCostsComplete(check: ClosingCheck, currBookings: Booking[], prevBookings: Booking[]): ClosingCheck {
  const accountCounts: { [key: string]: number } = {};
  prevBookings.forEach(b => {
    accountCounts[b.account] = (accountCounts[b.account] || 0) + 1;
  });

  const recurringAccounts = Object.keys(accountCounts).filter(acc => accountCounts[acc] > 3);
  const currAccountStrings = new Set(currBookings.map(b => String(b.account)));

  const missingAccounts = recurringAccounts.filter(acc => !currAccountStrings.has(acc));
  const passed = missingAccounts.length === 0;
  const score = passed ? 100 : 50;

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: missingAccounts.length > 0
        ? [`Fehlende Konten aus Vorperiode: ${missingAccounts.join(', ')}`]
        : ['Alle regelmäßigen Konten sind vorhanden'],
    } as CheckResult,
  };
}

function runErrorScan(check: ClosingCheck, currBookings: Booking[]): ClosingCheck {
  let duplicateCount = 0;
  let weekendCount = 0;

  const vendorAmountMap: { [key: string]: Booking[] } = {};
  currBookings.forEach(b => {
    const key = `${b.vendor || ''}|${b.amount}`;
    if (!vendorAmountMap[key]) vendorAmountMap[key] = [];
    vendorAmountMap[key].push(b);
  });

  Object.values(vendorAmountMap).forEach(bookings => {
    if (bookings.length > 1) {
      const dayDiffs = bookings.map((b, i, arr) => {
        if (i === 0) return 0;
        const date1 = new Date(b.posting_date);
        const date2 = new Date(arr[i - 1].posting_date);
        return Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
      });

      if (dayDiffs.some(diff => diff <= 30)) {
        duplicateCount += bookings.length - 1;
      }
    }
  });

  currBookings.forEach(b => {
    const date = new Date(b.posting_date);
    const day = date.getDay();
    if (day === 0 || day === 6) weekendCount++;
  });

  const score = Math.max(0, 100 - (duplicateCount * 10 + weekendCount * 2));
  const passed = score >= 80;
  const findings = [];
  if (duplicateCount > 0) findings.push(`${duplicateCount} mögliche Duplikate gefunden`);
  if (weekendCount > 0) findings.push(`${weekendCount} Buchungen am Wochenende`);

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: findings.length > 0 ? findings : ['Keine Fehler gefunden'],
    } as CheckResult,
  };
}

function runUnusualBookings(check: ClosingCheck, currBookings: Booking[]): ClosingCheck {
  const accountAmounts: { [key: string]: number[] } = {};
  currBookings.forEach(b => {
    if (!accountAmounts[b.account]) accountAmounts[b.account] = [];
    accountAmounts[b.account].push(Math.abs(b.amount));
  });

  const findings: string[] = [];

  Object.entries(accountAmounts).forEach(([account, amounts]) => {
    if (amounts.length < 2) return;

    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 3 * stdDev;

    const unusual = currBookings.filter(
      b => String(b.account) === account && Math.abs(b.amount) > threshold
    );

    if (unusual.length > 0) {
      findings.push(`Konto ${account}: ${unusual.length} ungewöhnliche Buchung(en)`);
    }
  });

  const passed = findings.length === 0;
  const score = passed ? 100 : 50;

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: findings.length > 0 ? findings : ['Keine ungewöhnlichen Buchungen'],
    } as CheckResult,
  };
}

function runReversalCheck(check: ClosingCheck, currBookings: Booking[]): ClosingCheck {
  const reversalKeywords = ['Storno', 'Korrektur', 'Gutschrift', 'Rückbuchung'];
  const reversalCount = currBookings.filter(b => {
    const text = b.text.toLowerCase();
    return reversalKeywords.some(kw => text.includes(kw.toLowerCase()));
  }).length;

  const percentage = currBookings.length > 0 ? (reversalCount / currBookings.length) * 100 : 0;
  let passed = true;
  let score = 100;

  if (percentage > 8) {
    passed = false;
    score = 0;
  } else if (percentage >= 3) {
    score = 60;
  }

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: [`Storno-/Korrekturbuchungen: ${percentage.toFixed(1)}%`],
    } as CheckResult,
  };
}

function runAllAccountsActive(check: ClosingCheck, currBookings: Booking[], prevBookings: Booking[]): ClosingCheck {
  const prevAccounts = new Set(prevBookings.map(b => b.account));
  const currAccounts = new Set(currBookings.map(b => b.account));

  const missingCount = Array.from(prevAccounts).filter(acc => !currAccounts.has(acc)).length;
  const percentage = prevAccounts.size > 0 ? (missingCount / prevAccounts.size) * 100 : 0;

  let passed = true;
  let score = 100;

  if (percentage > 15) {
    passed = false;
    score = 0;
  } else if (percentage >= 5) {
    score = 60;
  }

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: [`${missingCount} Konten aus Vorperiode nicht aktiv (${percentage.toFixed(1)}%)`],
    } as CheckResult,
  };
}

function runVolumePlausible(check: ClosingCheck, currBookings: Booking[], prevBookings: Booking[]): ClosingCheck {
  const currCount = currBookings.length;
  const prevCount = prevBookings.length;
  const currSum = Math.abs(currBookings.reduce((sum, b) => sum + b.amount, 0));
  const prevSum = Math.abs(prevBookings.reduce((sum, b) => sum + b.amount, 0));

  const countDeviation = prevCount > 0 ? Math.abs((currCount - prevCount) / prevCount) * 100 : 0;
  const sumDeviation = prevSum > 0 ? Math.abs((currSum - prevSum) / prevSum) * 100 : 0;

  let passed = true;
  let score = 100;

  if (countDeviation > 50 || sumDeviation > 50) {
    passed = false;
    score = 0;
  } else if (countDeviation > 30 || sumDeviation > 30) {
    score = 60;
  }

  return {
    ...check,
    status: scoreToStatus(score),
    result: {
      passed,
      score,
      findings: [
        `Buchungsvolumen Abweichung: ${countDeviation.toFixed(1)}% (Menge), ${sumDeviation.toFixed(1)}% (Summe)`,
      ],
    } as CheckResult,
  };
}

export function runAllAutomaticChecks(workflow: ClosingWorkflow, currBookings: Booking[], prevBookings: Booking[]): ClosingWorkflow {
  const updatedChecks = workflow.checks.map(check => {
    if (check.isAutomatic) {
      return runCheck(check, currBookings, prevBookings);
    }
    return check;
  });

  const progress = calculateProgress({ ...workflow, checks: updatedChecks });
  const allCompleted = updatedChecks.every(check => check.status !== 'pending' && check.status !== 'running');

  return {
    ...workflow,
    checks: updatedChecks,
    progress,
    status: allCompleted ? 'review' : 'in_progress',
  };
}

export function calculateProgress(workflow: ClosingWorkflow): number {
  const completedChecks = workflow.checks.filter(
    check => check.status !== 'pending' && check.status !== 'running'
  ).length;
  return Math.round((completedChecks / workflow.checks.length) * 100);
}

export function generateClosingSummary(workflow: ClosingWorkflow): string[] {
  const summary: string[] = [];

  const completedChecks = workflow.checks.filter(c => c.status !== 'pending' && c.status !== 'running');
  const passedChecks = workflow.checks.filter(c => c.result?.passed);
  const warningChecks = workflow.checks.filter(c => c.result?.score && c.result.score >= 50 && c.result.score < 100);

  summary.push(`${completedChecks.length} von ${workflow.checks.length} Prüfungen abgeschlossen`);

  if (passedChecks.length > 0) {
    summary.push(`${passedChecks.length} Prüfungen erfolgreich bestanden`);
  }

  if (warningChecks.length > 0) {
    summary.push(`Warnung: ${warningChecks.length} Prüfungen weisen Abweichungen auf`);
  }

  workflow.checks.forEach(check => {
    if (check.result?.findings) {
      check.result.findings.forEach(finding => {
        summary.push(`${check.name}: ${finding}`);
      });
    }
  });

  if (summary.length === 0) {
    summary.push('Keine Prüfungen durchgeführt');
  }

  return summary;
}
