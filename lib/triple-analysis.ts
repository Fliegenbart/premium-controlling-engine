/**
 * Triple Analysis: Plan vs. Ist vs. Vorjahr
 * The heart of controlling - comparing actual vs plan vs previous year
 */

import {
  Booking,
  PlanData,
  TripleAnalysisResult,
  TripleAccountDeviation,
  TripleCostCenterDeviation,
  TripleAnalysisConfig,
  TopBooking,
} from './types';

const DEFAULT_CONFIG: TripleAnalysisConfig = {
  wesentlichkeit_abs: 5000,
  wesentlichkeit_pct: 5,
  period_vj_name: 'Vorjahr',
  period_plan_name: 'Plan',
  period_ist_name: 'Ist',
  threshold_yellow_pct: 5,
  threshold_red_pct: 10,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Helper functions
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

function getTopBookings(bookings: Booking[], account: number, topN: number = 5): TopBooking[] {
  return bookings
    .filter(b => b.account === account)
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

function getStatus(
  deltaPlanPct: number,
  isExpense: boolean,
  thresholdYellow: number,
  thresholdRed: number
): 'on_track' | 'over_plan' | 'under_plan' | 'critical' {
  const absPct = Math.abs(deltaPlanPct);

  // For expenses: positive delta (over plan) is bad
  // For revenue: negative delta (under plan) is bad
  const isBad = isExpense ? deltaPlanPct > 0 : deltaPlanPct < 0;

  if (absPct <= thresholdYellow) {
    return 'on_track';
  } else if (absPct <= thresholdRed) {
    return isBad ? 'over_plan' : 'under_plan';
  } else {
    return 'critical';
  }
}

function generateTripleComment(
  account: number,
  accountName: string,
  deltaPlan: number,
  deltaPlanPct: number,
  deltaVJ: number,
  deltaVJPct: number,
  status: string
): string {
  const isExpense = account >= 5000;

  let comment = '';

  // Plan comparison
  if (Math.abs(deltaPlanPct) < 5) {
    comment += `Im Plan. `;
  } else if (deltaPlan > 0) {
    comment += isExpense
      ? `Über Plan um ${formatCurrency(deltaPlan)} (+${deltaPlanPct.toFixed(1)}%). `
      : `Über Plan um ${formatCurrency(deltaPlan)} (+${deltaPlanPct.toFixed(1)}%). `;
  } else {
    comment += isExpense
      ? `Unter Plan um ${formatCurrency(Math.abs(deltaPlan))} (${deltaPlanPct.toFixed(1)}%). `
      : `Unter Plan um ${formatCurrency(Math.abs(deltaPlan))} (${deltaPlanPct.toFixed(1)}%). `;
  }

  // VJ comparison
  if (deltaVJ > 0) {
    comment += isExpense
      ? `Kosten gestiegen vs. VJ um ${formatCurrency(deltaVJ)} (+${deltaVJPct.toFixed(1)}%).`
      : `Erlöse gestiegen vs. VJ um ${formatCurrency(deltaVJ)} (+${deltaVJPct.toFixed(1)}%).`;
  } else if (deltaVJ < 0) {
    comment += isExpense
      ? `Kosten gesunken vs. VJ um ${formatCurrency(Math.abs(deltaVJ))} (${deltaVJPct.toFixed(1)}%).`
      : `Erlöse gesunken vs. VJ um ${formatCurrency(Math.abs(deltaVJ))} (${deltaVJPct.toFixed(1)}%).`;
  } else {
    comment += `Unverändert vs. VJ.`;
  }

  return comment;
}

/**
 * Main triple analysis function
 * Compares: Vorjahr (VJ) vs. Plan vs. Ist (Actual)
 */
export function analyzeTriple(
  vjBookings: Booking[],
  planData: PlanData[],
  istBookings: Booking[],
  config: Partial<TripleAnalysisConfig> = {}
): TripleAnalysisResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Create plan lookup
  const planByAccount = new Map<number, PlanData>();
  for (const p of planData) {
    planByAccount.set(p.account, p);
  }

  // Aggregate bookings by account
  const vjByAccount = groupBy(vjBookings, b => `${b.account}|${b.account_name}`);
  const istByAccount = groupBy(istBookings, b => `${b.account}|${b.account_name}`);

  // Get all unique accounts
  const allAccountKeys = new Set([
    ...vjByAccount.keys(),
    ...istByAccount.keys(),
    ...planData.map(p => `${p.account}|${p.account_name}`),
  ]);

  // Calculate account deviations
  const accountDeviations: TripleAccountDeviation[] = [];
  let greenCount = 0, yellowCount = 0, redCount = 0;

  for (const key of allAccountKeys) {
    const [accountStr, accountName] = key.split('|');
    const account = parseInt(accountStr);
    const isExpense = account >= 5000;

    const amountVJ = sumBy(vjByAccount.get(key) || [], b => b.amount);
    const amountIst = sumBy(istByAccount.get(key) || [], b => b.amount);
    const planEntry = planByAccount.get(account);
    const amountPlan = planEntry?.amount || amountVJ; // Use VJ as fallback if no plan

    // Calculate deltas
    const deltaPlanAbs = amountIst - amountPlan;
    const deltaPlanPct = amountPlan !== 0 ? (deltaPlanAbs / Math.abs(amountPlan)) * 100 : 0;
    const deltaVJAbs = amountIst - amountVJ;
    const deltaVJPct = amountVJ !== 0 ? (deltaVJAbs / Math.abs(amountVJ)) * 100 : 0;
    const planVsVJAbs = amountPlan - amountVJ;
    const planVsVJPct = amountVJ !== 0 ? (planVsVJAbs / Math.abs(amountVJ)) * 100 : 0;

    // Check materiality (either vs Plan or vs VJ)
    const isWesentlich =
      (Math.abs(deltaPlanAbs) >= cfg.wesentlichkeit_abs && Math.abs(deltaPlanPct) >= cfg.wesentlichkeit_pct) ||
      (Math.abs(deltaVJAbs) >= cfg.wesentlichkeit_abs && Math.abs(deltaVJPct) >= cfg.wesentlichkeit_pct);

    if (isWesentlich) {
      const status = getStatus(deltaPlanPct, isExpense, cfg.threshold_yellow_pct, cfg.threshold_red_pct);

      // Count traffic lights
      if (status === 'on_track') greenCount++;
      else if (status === 'critical') redCount++;
      else yellowCount++;

      const istAccountBookings = istByAccount.get(key) || [];

      accountDeviations.push({
        account,
        account_name: accountName,
        amount_vj: amountVJ,
        amount_plan: amountPlan,
        amount_ist: amountIst,
        delta_plan_abs: deltaPlanAbs,
        delta_plan_pct: deltaPlanPct,
        delta_vj_abs: deltaVJAbs,
        delta_vj_pct: deltaVJPct,
        plan_vs_vj_abs: planVsVJAbs,
        plan_vs_vj_pct: planVsVJPct,
        status,
        comment: generateTripleComment(account, accountName, deltaPlanAbs, deltaPlanPct, deltaVJAbs, deltaVJPct, status),
        top_bookings_ist: getTopBookings(istBookings, account),
        bookings_count_ist: istAccountBookings.length,
      });
    }
  }

  // Sort by absolute plan deviation
  accountDeviations.sort((a, b) => Math.abs(b.delta_plan_abs) - Math.abs(a.delta_plan_abs));

  // Aggregate by cost center
  const vjByCostCenter = groupBy(vjBookings, b => b.cost_center);
  const istByCostCenter = groupBy(istBookings, b => b.cost_center);
  const allCostCenters = new Set([...vjByCostCenter.keys(), ...istByCostCenter.keys()]);

  const costCenterDeviations: TripleCostCenterDeviation[] = [];

  for (const cc of allCostCenters) {
    const amountVJ = sumBy(vjByCostCenter.get(cc) || [], b => b.amount);
    const amountIst = sumBy(istByCostCenter.get(cc) || [], b => b.amount);
    // For cost centers, sum plan by matching accounts
    const ccAccounts = new Set([
      ...(vjByCostCenter.get(cc) || []).map(b => b.account),
      ...(istByCostCenter.get(cc) || []).map(b => b.account),
    ]);
    let amountPlan = 0;
    for (const acc of ccAccounts) {
      const planEntry = planByAccount.get(acc);
      if (planEntry) amountPlan += planEntry.amount;
    }
    if (amountPlan === 0) amountPlan = amountVJ; // Fallback

    const deltaPlanAbs = amountIst - amountPlan;
    const deltaPlanPct = amountPlan !== 0 ? (deltaPlanAbs / Math.abs(amountPlan)) * 100 : 0;
    const deltaVJAbs = amountIst - amountVJ;
    const deltaVJPct = amountVJ !== 0 ? (deltaVJAbs / Math.abs(amountVJ)) * 100 : 0;

    if (Math.abs(deltaPlanAbs) >= cfg.wesentlichkeit_abs && Math.abs(deltaPlanPct) >= cfg.wesentlichkeit_pct) {
      const status = getStatus(deltaPlanPct, true, cfg.threshold_yellow_pct, cfg.threshold_red_pct);

      // Find top accounts for this cost center
      const ccVJByAccount = groupBy(vjByCostCenter.get(cc) || [], b => `${b.account}|${b.account_name}`);
      const ccIstByAccount = groupBy(istByCostCenter.get(cc) || [], b => `${b.account}|${b.account_name}`);
      const ccAllAccounts = new Set([...ccVJByAccount.keys(), ...ccIstByAccount.keys()]);

      const topAccounts: { account: number; account_name: string; delta_plan_abs: number; delta_vj_abs: number }[] = [];
      for (const accKey of ccAllAccounts) {
        const [accStr, accName] = accKey.split('|');
        const acc = parseInt(accStr);
        const vjAmt = sumBy(ccVJByAccount.get(accKey) || [], b => b.amount);
        const istAmt = sumBy(ccIstByAccount.get(accKey) || [], b => b.amount);
        const planEntry = planByAccount.get(acc);
        const planAmt = planEntry?.amount || vjAmt;

        topAccounts.push({
          account: acc,
          account_name: accName,
          delta_plan_abs: istAmt - planAmt,
          delta_vj_abs: istAmt - vjAmt,
        });
      }
      topAccounts.sort((a, b) => Math.abs(b.delta_plan_abs) - Math.abs(a.delta_plan_abs));

      costCenterDeviations.push({
        cost_center: cc,
        amount_vj: amountVJ,
        amount_plan: amountPlan,
        amount_ist: amountIst,
        delta_plan_abs: deltaPlanAbs,
        delta_plan_pct: deltaPlanPct,
        delta_vj_abs: deltaVJAbs,
        delta_vj_pct: deltaVJPct,
        status,
        top_accounts: topAccounts.slice(0, 3),
      });
    }
  }

  costCenterDeviations.sort((a, b) => Math.abs(b.delta_plan_abs) - Math.abs(a.delta_plan_abs));

  // Calculate summary
  const totalVJ = sumBy(vjBookings, b => b.amount);
  const totalIst = sumBy(istBookings, b => b.amount);
  const totalPlan = planData.reduce((sum, p) => sum + p.amount, 0) || totalVJ;

  const erloesesVJ = sumBy(vjBookings.filter(b => b.amount > 0), b => b.amount);
  const erloesesIst = sumBy(istBookings.filter(b => b.amount > 0), b => b.amount);
  const erloesesPlan = planData.filter(p => p.amount > 0).reduce((sum, p) => sum + p.amount, 0) || erloesesVJ;

  const aufwendungenVJ = sumBy(vjBookings.filter(b => b.amount < 0), b => b.amount);
  const aufwendungenIst = sumBy(istBookings.filter(b => b.amount < 0), b => b.amount);
  const aufwendungenPlan = planData.filter(p => p.amount < 0).reduce((sum, p) => sum + p.amount, 0) || aufwendungenVJ;

  return {
    meta: {
      period_vj: cfg.period_vj_name,
      period_plan: cfg.period_plan_name,
      period_ist: cfg.period_ist_name,
      total_vj: totalVJ,
      total_plan: totalPlan,
      total_ist: totalIst,
      bookings_ist: istBookings.length,
      wesentlichkeit_abs: cfg.wesentlichkeit_abs,
      wesentlichkeit_pct: cfg.wesentlichkeit_pct,
    },
    summary: {
      total_delta_plan: totalIst - totalPlan,
      total_delta_vj: totalIst - totalVJ,
      erloese_vj: erloesesVJ,
      erloese_plan: erloesesPlan,
      erloese_ist: erloesesIst,
      erloese_delta_plan: erloesesIst - erloesesPlan,
      erloese_delta_vj: erloesesIst - erloesesVJ,
      aufwendungen_vj: aufwendungenVJ,
      aufwendungen_plan: aufwendungenPlan,
      aufwendungen_ist: aufwendungenIst,
      aufwendungen_delta_plan: aufwendungenIst - aufwendungenPlan,
      aufwendungen_delta_vj: aufwendungenIst - aufwendungenVJ,
      plan_achievement_pct: totalPlan !== 0 ? (totalIst / totalPlan) * 100 : 100,
    },
    by_account: accountDeviations,
    by_cost_center: costCenterDeviations,
    traffic_light: {
      green: greenCount,
      yellow: yellowCount,
      red: redCount,
    },
  };
}

/**
 * Parse plan CSV to PlanData array
 * Expected format: account,account_name,amount
 */
export function parsePlanCSV(csvText: string): PlanData[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase());
  const planData: PlanData[] = [];

  // Find column indices
  const accountIdx = headers.findIndex(h => h.includes('konto') || h.includes('account') || h === 'kontonr');
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('bezeichnung'));
  const amountIdx = headers.findIndex(h => h.includes('betrag') || h.includes('amount') || h.includes('plan') || h.includes('budget'));

  if (accountIdx === -1 || amountIdx === -1) {
    // Try simple format: just account, amount
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/[,;]/);
      if (values.length >= 2) {
        const account = parseInt(values[0]);
        const amount = parseFloat(values[values.length - 1].replace(/[^\d.-]/g, ''));
        if (!isNaN(account) && !isNaN(amount)) {
          planData.push({
            account,
            account_name: values.length > 2 ? values[1].trim() : `Konto ${account}`,
            amount,
          });
        }
      }
    }
    return planData;
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;]/);
    const account = parseInt(values[accountIdx]);
    const amount = parseFloat(values[amountIdx].replace(/[^\d.-]/g, ''));

    if (!isNaN(account) && !isNaN(amount)) {
      planData.push({
        account,
        account_name: nameIdx !== -1 ? values[nameIdx]?.trim() || `Konto ${account}` : `Konto ${account}`,
        amount,
      });
    }
  }

  return planData;
}
