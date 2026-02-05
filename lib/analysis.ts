import { Booking, AnalysisResult, AccountDeviation, CostCenterDeviation, DetailDeviation, TopBooking, AnalysisConfig } from './types';

const DEFAULT_CONFIG: AnalysisConfig = {
  wesentlichkeit_abs: 5000,
  wesentlichkeit_pct: 10,
  period_prev_name: 'Vorjahr',
  period_curr_name: 'Aktuelles Jahr',
  use_ai_comments: false,
};

// Aggregation helpers
function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    const existing = map.get(k) || [];
    existing.push(item);
    map.set(k, existing);
  }
  return map;
}

function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((sum, item) => sum + fn(item), 0);
}

// Get top bookings for an account
function getTopBookings(bookings: Booking[], account: number, costCenter?: string, topN: number = 10): TopBooking[] {
  let filtered = bookings.filter(b => b.account === account);
  if (costCenter) {
    filtered = filtered.filter(b => b.cost_center === costCenter);
  }

  return filtered
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, topN)
    .map(b => ({
      date: b.posting_date,
      amount: b.amount,
      text: b.text,
      vendor: b.vendor,
      customer: b.customer,
      document_no: b.document_no,
    }));
}

// Convert Booking to TopBooking
function bookingToTopBooking(b: Booking): TopBooking {
  return {
    date: b.posting_date,
    amount: b.amount,
    text: b.text,
    vendor: b.vendor,
    customer: b.customer,
    document_no: b.document_no,
  };
}

// Find new bookings (exist in current but not in previous, based on similar text/vendor/amount pattern)
function findNewBookings(prevBookings: Booking[], currBookings: Booking[], account: number, topN: number = 5): TopBooking[] {
  const prevForAccount = prevBookings.filter(b => b.account === account);
  const currForAccount = currBookings.filter(b => b.account === account);

  // Create a signature for each booking to find matches
  const prevSignatures = new Set(prevForAccount.map(b =>
    `${b.text.toLowerCase().substring(0, 30)}|${b.vendor || ''}|${Math.round(b.amount / 100) * 100}`
  ));

  // Find bookings in current that don't have a similar match in previous
  const newBookings = currForAccount.filter(b => {
    const sig = `${b.text.toLowerCase().substring(0, 30)}|${b.vendor || ''}|${Math.round(b.amount / 100) * 100}`;
    return !prevSignatures.has(sig);
  });

  return newBookings
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, topN)
    .map(bookingToTopBooking);
}

// Find missing bookings (existed in previous but not in current)
function findMissingBookings(prevBookings: Booking[], currBookings: Booking[], account: number, topN: number = 5): TopBooking[] {
  const prevForAccount = prevBookings.filter(b => b.account === account);
  const currForAccount = currBookings.filter(b => b.account === account);

  // Create a signature for each booking to find matches
  const currSignatures = new Set(currForAccount.map(b =>
    `${b.text.toLowerCase().substring(0, 30)}|${b.vendor || ''}|${Math.round(b.amount / 100) * 100}`
  ));

  // Find bookings in previous that don't have a similar match in current
  const missingBookings = prevForAccount.filter(b => {
    const sig = `${b.text.toLowerCase().substring(0, 30)}|${b.vendor || ''}|${Math.round(b.amount / 100) * 100}`;
    return !currSignatures.has(sig);
  });

  return missingBookings
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, topN)
    .map(bookingToTopBooking);
}

// Generate rule-based comment
function generateComment(
  delta: number,
  deltaPct: number,
  account: number,
  topBookings: TopBooking[]
): string {
  const isExpense = account >= 5000;
  let direction: string;

  if (delta > 0) {
    direction = isExpense ? 'Kostensenkung' : 'Umsatzsteigerung';
  } else {
    direction = isExpense ? 'Kostensteigerung' : 'Umsatzrückgang';
  }

  const parts: string[] = [
    `${direction} um ${formatCurrency(Math.abs(delta))} (${Math.abs(deltaPct).toFixed(1)}%).`
  ];

  if (topBookings.length > 0) {
    parts.push('Haupttreiber:');
    for (const b of topBookings) {
      const entity = b.vendor || b.customer || '';
      if (entity) {
        parts.push(`  - ${b.text} (${entity}): ${formatCurrency(b.amount)}`);
      } else {
        parts.push(`  - ${b.text}: ${formatCurrency(b.amount)}`);
      }
    }
  }

  return parts.join('\n');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Main analysis function
export function analyzeBookings(
  prevBookings: Booking[],
  currBookings: Booking[],
  config: Partial<AnalysisConfig> = {}
): AnalysisResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Aggregate by account
  const prevByAccount = groupBy(prevBookings, b => `${b.account}|${b.account_name}`);
  const currByAccount = groupBy(currBookings, b => `${b.account}|${b.account_name}`);

  // Get all unique accounts
  const allAccountKeys = new Set([...prevByAccount.keys(), ...currByAccount.keys()]);

  // Calculate account deviations
  const accountDeviations: AccountDeviation[] = [];
  for (const key of allAccountKeys) {
    const [accountStr, accountName] = key.split('|');
    const account = parseInt(accountStr);

    const prevAmount = sumBy(prevByAccount.get(key) || [], b => b.amount);
    const currAmount = sumBy(currByAccount.get(key) || [], b => b.amount);
    const deltaAbs = currAmount - prevAmount;
    const deltaPct = prevAmount !== 0
      ? (deltaAbs / Math.abs(prevAmount)) * 100
      : (deltaAbs !== 0 ? 100 : 0);

    // Check materiality
    if (Math.abs(deltaAbs) >= cfg.wesentlichkeit_abs && Math.abs(deltaPct) >= cfg.wesentlichkeit_pct) {
      const prevAccountBookings = prevByAccount.get(key) || [];
      const currAccountBookings = currByAccount.get(key) || [];

      const topBookingsPrev = getTopBookings(prevBookings, account);
      const topBookingsCurr = getTopBookings(currBookings, account);
      const newBookings = findNewBookings(prevBookings, currBookings, account);
      const missingBookings = findMissingBookings(prevBookings, currBookings, account);

      accountDeviations.push({
        account,
        account_name: accountName,
        amount_prev: prevAmount,
        amount_curr: currAmount,
        delta_abs: deltaAbs,
        delta_pct: deltaPct,
        comment: generateComment(deltaAbs, deltaPct, account, topBookingsCurr.slice(0, 3)),
        top_bookings: topBookingsCurr.slice(0, 3),
        // Enhanced evidence tracking
        top_bookings_prev: topBookingsPrev,
        top_bookings_curr: topBookingsCurr,
        new_bookings: newBookings,
        missing_bookings: missingBookings,
        bookings_count_prev: prevAccountBookings.length,
        bookings_count_curr: currAccountBookings.length,
      });
    }
  }

  // Sort by absolute deviation
  accountDeviations.sort((a, b) => Math.abs(b.delta_abs) - Math.abs(a.delta_abs));

  // Aggregate by cost center
  const prevByCostCenter = groupBy(prevBookings, b => b.cost_center);
  const currByCostCenter = groupBy(currBookings, b => b.cost_center);
  const allCostCenters = new Set([...prevByCostCenter.keys(), ...currByCostCenter.keys()]);

  const costCenterDeviations: CostCenterDeviation[] = [];
  for (const cc of allCostCenters) {
    const prevAmount = sumBy(prevByCostCenter.get(cc) || [], b => b.amount);
    const currAmount = sumBy(currByCostCenter.get(cc) || [], b => b.amount);
    const deltaAbs = currAmount - prevAmount;
    const deltaPct = prevAmount !== 0
      ? (deltaAbs / Math.abs(prevAmount)) * 100
      : (deltaAbs !== 0 ? 100 : 0);

    if (Math.abs(deltaAbs) >= cfg.wesentlichkeit_abs && Math.abs(deltaPct) >= cfg.wesentlichkeit_pct) {
      // Find top accounts for this cost center
      const ccPrevByAccount = groupBy((prevByCostCenter.get(cc) || []), b => `${b.account}|${b.account_name}`);
      const ccCurrByAccount = groupBy((currByCostCenter.get(cc) || []), b => `${b.account}|${b.account_name}`);
      const ccAllAccounts = new Set([...ccPrevByAccount.keys(), ...ccCurrByAccount.keys()]);

      const topAccounts: { account: number; account_name: string; delta_abs: number }[] = [];
      for (const key of ccAllAccounts) {
        const [accountStr, accountName] = key.split('|');
        const account = parseInt(accountStr);
        const prevAmt = sumBy(ccPrevByAccount.get(key) || [], b => b.amount);
        const currAmt = sumBy(ccCurrByAccount.get(key) || [], b => b.amount);
        topAccounts.push({
          account,
          account_name: accountName,
          delta_abs: currAmt - prevAmt,
        });
      }

      topAccounts.sort((a, b) => Math.abs(b.delta_abs) - Math.abs(a.delta_abs));

      costCenterDeviations.push({
        cost_center: cc,
        amount_prev: prevAmount,
        amount_curr: currAmount,
        delta_abs: deltaAbs,
        delta_pct: deltaPct,
        top_accounts: topAccounts.slice(0, 3),
      });
    }
  }

  costCenterDeviations.sort((a, b) => Math.abs(b.delta_abs) - Math.abs(a.delta_abs));

  // Aggregate by account AND cost center (detail)
  const prevByDetail = groupBy(prevBookings, b => `${b.account}|${b.account_name}|${b.cost_center}`);
  const currByDetail = groupBy(currBookings, b => `${b.account}|${b.account_name}|${b.cost_center}`);
  const allDetailKeys = new Set([...prevByDetail.keys(), ...currByDetail.keys()]);

  const detailDeviations: DetailDeviation[] = [];
  for (const key of allDetailKeys) {
    const [accountStr, accountName, costCenter] = key.split('|');
    const account = parseInt(accountStr);

    const prevAmount = sumBy(prevByDetail.get(key) || [], b => b.amount);
    const currAmount = sumBy(currByDetail.get(key) || [], b => b.amount);
    const deltaAbs = currAmount - prevAmount;
    const deltaPct = prevAmount !== 0
      ? (deltaAbs / Math.abs(prevAmount)) * 100
      : (deltaAbs !== 0 ? 100 : 0);

    if (Math.abs(deltaAbs) >= cfg.wesentlichkeit_abs && Math.abs(deltaPct) >= cfg.wesentlichkeit_pct) {
      const topBookings = getTopBookings(currBookings, account, costCenter);
      detailDeviations.push({
        account,
        account_name: accountName,
        cost_center: costCenter,
        amount_prev: prevAmount,
        amount_curr: currAmount,
        delta_abs: deltaAbs,
        delta_pct: deltaPct,
        comment: generateComment(deltaAbs, deltaPct, account, topBookings),
      });
    }
  }

  detailDeviations.sort((a, b) => Math.abs(b.delta_abs) - Math.abs(a.delta_abs));

  // Calculate summary
  const totalPrev = sumBy(prevBookings, b => b.amount);
  const totalCurr = sumBy(currBookings, b => b.amount);
  const erloesesPrev = sumBy(prevBookings.filter(b => b.amount > 0), b => b.amount);
  const erloesesCurr = sumBy(currBookings.filter(b => b.amount > 0), b => b.amount);
  const aufwendungenPrev = sumBy(prevBookings.filter(b => b.amount < 0), b => b.amount);
  const aufwendungenCurr = sumBy(currBookings.filter(b => b.amount < 0), b => b.amount);

  return {
    meta: {
      period_prev: cfg.period_prev_name,
      period_curr: cfg.period_curr_name,
      total_prev: totalPrev,
      total_curr: totalCurr,
      bookings_prev: prevBookings.length,
      bookings_curr: currBookings.length,
      wesentlichkeit_abs: cfg.wesentlichkeit_abs,
      wesentlichkeit_pct: cfg.wesentlichkeit_pct,
    },
    summary: {
      total_delta: totalCurr - totalPrev,
      erloese_prev: erloesesPrev,
      erloese_curr: erloesesCurr,
      aufwendungen_prev: aufwendungenPrev,
      aufwendungen_curr: aufwendungenCurr,
    },
    by_account: accountDeviations,
    by_cost_center: costCenterDeviations,
    by_detail: detailDeviations.slice(0, 15),
  };
}

// Parse CSV to Booking array
export function parseCSV(csvText: string): Booking[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const bookings: Booking[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });

    bookings.push({
      posting_date: row['posting_date'] || '',
      amount: parseFloat(row['amount']) || 0,
      account: parseInt(row['account']) || 0,
      account_name: row['account_name'] || '',
      cost_center: row['cost_center'] || '',
      profit_center: row['profit_center'] || '',
      vendor: row['vendor'] || null,
      customer: row['customer'] || null,
      document_no: row['document_no'] || '',
      text: row['text'] || '',
    });
  }

  return bookings;
}

// Helper to parse CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}
