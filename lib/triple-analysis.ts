/**
 * Triple Analysis Engine - Plan vs. Ist vs. Vorjahr
 *
 * Implements three-way variance analysis with:
 * - Plan achievement tracking
 * - Year-over-year comparison
 * - Traffic light status (Ampel)
 * - DuckDB-powered analytics
 */

import { getConnection, initDatabase } from './duckdb-engine';
import { TripleAnalysisResult, TripleAccountDeviation, TopBooking } from './types';

interface TripleAnalysisOptions {
  wesentlichkeitAbs?: number; // Materiality threshold absolute
  wesentlichkeitPct?: number; // Materiality threshold percentage
  includeTopBookings?: boolean;
  maxAccounts?: number;
}

const DEFAULT_OPTIONS: TripleAnalysisOptions = {
  wesentlichkeitAbs: 5000,
  wesentlichkeitPct: 5,
  includeTopBookings: true,
  maxAccounts: 50,
};

async function fetchAllRows(
  conn: Awaited<ReturnType<typeof getConnection>>,
  sql: string
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    conn.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as Record<string, unknown>[]);
    });
  });
}

/**
 * Run triple analysis: Plan vs. Ist vs. Vorjahr
 */
export async function analyzeTriple(
  tableVJ: string = 'controlling.bookings_vj',
  tablePlan: string = 'controlling.bookings_plan',
  tableIst: string = 'controlling.bookings_ist',
  options: TripleAnalysisOptions = {}
): Promise<TripleAnalysisResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await initDatabase();
  const conn = await getConnection();

  // Get period metadata
  const metaRows = await fetchAllRows(conn, `
    WITH vj AS (
      SELECT
        MIN(posting_date) as min_date,
        MAX(posting_date) as max_date,
        SUM(amount) as total,
        COUNT(*) as cnt
      FROM ${tableVJ}
    ),
    plan AS (
      SELECT
        MIN(posting_date) as min_date,
        MAX(posting_date) as max_date,
        SUM(amount) as total,
        COUNT(*) as cnt
      FROM ${tablePlan}
    ),
    ist AS (
      SELECT
        MIN(posting_date) as min_date,
        MAX(posting_date) as max_date,
        SUM(amount) as total,
        COUNT(*) as cnt
      FROM ${tableIst}
    )
    SELECT
      vj.min_date as vj_min, vj.max_date as vj_max, vj.total as vj_total, vj.cnt as vj_cnt,
      plan.min_date as plan_min, plan.max_date as plan_max, plan.total as plan_total, plan.cnt as plan_cnt,
      ist.min_date as ist_min, ist.max_date as ist_max, ist.total as ist_total, ist.cnt as ist_cnt
    FROM vj, plan, ist
  `);

  const meta = (metaRows[0] ?? {}) as Record<string, unknown>;

  // Account-level triple variance
  const varianceRows = await fetchAllRows(conn, `
    WITH vj AS (
      SELECT account, account_name, SUM(amount) as amount, COUNT(*) as cnt
      FROM ${tableVJ}
      GROUP BY account, account_name
    ),
    plan AS (
      SELECT account, account_name, SUM(amount) as amount, COUNT(*) as cnt
      FROM ${tablePlan}
      GROUP BY account, account_name
    ),
    ist AS (
      SELECT account, account_name, SUM(amount) as amount, COUNT(*) as cnt
      FROM ${tableIst}
      GROUP BY account, account_name
    )
    SELECT
      COALESCE(vj.account, plan.account, ist.account) as account,
      COALESCE(vj.account_name, plan.account_name, ist.account_name) as account_name,
      COALESCE(vj.amount, 0) as amount_vj,
      COALESCE(plan.amount, 0) as amount_plan,
      COALESCE(ist.amount, 0) as amount_ist,
      COALESCE(ist.cnt, 0) as cnt_ist,
      -- Delta Ist vs Plan
      COALESCE(ist.amount, 0) - COALESCE(plan.amount, 0) as delta_plan_abs,
      CASE
        WHEN COALESCE(plan.amount, 0) = 0 THEN
          CASE WHEN COALESCE(ist.amount, 0) = 0 THEN 0 ELSE 100 END
        ELSE (COALESCE(ist.amount, 0) - plan.amount) / ABS(plan.amount) * 100
      END as delta_plan_pct,
      -- Delta Ist vs VJ
      COALESCE(ist.amount, 0) - COALESCE(vj.amount, 0) as delta_vj_abs,
      CASE
        WHEN COALESCE(vj.amount, 0) = 0 THEN
          CASE WHEN COALESCE(ist.amount, 0) = 0 THEN 0 ELSE 100 END
        ELSE (COALESCE(ist.amount, 0) - vj.amount) / ABS(vj.amount) * 100
      END as delta_vj_pct,
      -- Plan vs VJ
      COALESCE(plan.amount, 0) - COALESCE(vj.amount, 0) as plan_vs_vj_abs,
      CASE
        WHEN COALESCE(vj.amount, 0) = 0 THEN
          CASE WHEN COALESCE(plan.amount, 0) = 0 THEN 0 ELSE 100 END
        ELSE (COALESCE(plan.amount, 0) - vj.amount) / ABS(vj.amount) * 100
      END as plan_vs_vj_pct
    FROM vj
    FULL OUTER JOIN plan ON vj.account = plan.account
    FULL OUTER JOIN ist ON COALESCE(vj.account, plan.account) = ist.account
    WHERE ABS(COALESCE(ist.amount, 0) - COALESCE(plan.amount, 0)) >= ${opts.wesentlichkeitAbs}
       OR ABS(COALESCE(ist.amount, 0) - COALESCE(vj.amount, 0)) >= ${opts.wesentlichkeitAbs}
    ORDER BY ABS(COALESCE(ist.amount, 0) - COALESCE(plan.amount, 0)) DESC
    LIMIT ${opts.maxAccounts}
  `);

  // Build account deviations with status
  const byAccount: TripleAccountDeviation[] = [];
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  for (const row of varianceRows) {
    const deltaPlanPct = Number(row.delta_plan_pct);
    const deltaVjPct = Number(row.delta_vj_pct);
    const account = Number(row.account);
    const isExpense = account >= 5000;

    // Determine status (traffic light)
    let status: 'on_track' | 'over_plan' | 'under_plan' | 'critical';
    let comment = '';

    // For expenses: under plan = good (green), over plan = bad
    // For revenue: over plan = good (green), under plan = bad
    if (isExpense) {
      if (deltaPlanPct <= -5) {
        status = 'on_track';
        comment = 'Kosten unter Plan ✓';
        greenCount++;
      } else if (deltaPlanPct > 10) {
        status = 'critical';
        comment = 'Deutliche Kostenüberschreitung!';
        redCount++;
      } else if (deltaPlanPct > 0) {
        status = 'over_plan';
        comment = 'Leichte Planüberschreitung';
        yellowCount++;
      } else {
        status = 'on_track';
        comment = 'Im Plan';
        greenCount++;
      }
    } else {
      // Revenue accounts
      if (deltaPlanPct >= 5) {
        status = 'on_track';
        comment = 'Erlöse über Plan ✓';
        greenCount++;
      } else if (deltaPlanPct < -10) {
        status = 'critical';
        comment = 'Deutliches Erlösdefizit!';
        redCount++;
      } else if (deltaPlanPct < 0) {
        status = 'under_plan';
        comment = 'Leichtes Erlösdefizit';
        yellowCount++;
      } else {
        status = 'on_track';
        comment = 'Im Plan';
        greenCount++;
      }
    }

    const deviation: TripleAccountDeviation = {
      account,
      account_name: String(row.account_name),
      amount_vj: Number(row.amount_vj),
      amount_plan: Number(row.amount_plan),
      amount_ist: Number(row.amount_ist),
      delta_plan_abs: Number(row.delta_plan_abs),
      delta_plan_pct: deltaPlanPct,
      delta_vj_abs: Number(row.delta_vj_abs),
      delta_vj_pct: deltaVjPct,
      plan_vs_vj_abs: Number(row.plan_vs_vj_abs),
      plan_vs_vj_pct: Number(row.plan_vs_vj_pct),
      status,
      comment,
      bookings_count_ist: Number(row.cnt_ist),
    };

    // Get top bookings if requested
    if (opts.includeTopBookings && deviation.bookings_count_ist! > 0) {
      const topRows = await fetchAllRows(conn, `
        SELECT posting_date, amount, document_no, text, vendor, customer
        FROM ${tableIst}
        WHERE account = ${account}
        ORDER BY ABS(amount) DESC
        LIMIT 5
      `);
      deviation.top_bookings_ist = topRows.map((r) => ({
        date: String(r.posting_date),
        amount: Number(r.amount),
        document_no: String(r.document_no),
        text: String(r.text),
        vendor: r.vendor ? String(r.vendor) : undefined,
        customer: r.customer ? String(r.customer) : undefined,
      }));
    }

    byAccount.push(deviation);
  }

  // Calculate plan achievement
  const totalPlan = Number(meta.plan_total) || 0;
  const totalIst = Number(meta.ist_total) || 0;
  const planAchievementPct = totalPlan !== 0 ? (totalIst / totalPlan) * 100 : 100;

  return {
    meta: {
      period_vj: `${meta.vj_min} – ${meta.vj_max}`,
      period_plan: `${meta.plan_min} – ${meta.plan_max}`,
      period_ist: `${meta.ist_min} – ${meta.ist_max}`,
      total_vj: Number(meta.vj_total),
      total_plan: totalPlan,
      total_ist: totalIst,
      analyzed_at: new Date().toISOString(),
    },
    summary: {
      total_delta_plan: totalIst - totalPlan,
      total_delta_vj: totalIst - Number(meta.vj_total),
      plan_achievement_pct: planAchievementPct,
    },
    traffic_light: {
      green: greenCount,
      yellow: yellowCount,
      red: redCount,
    },
    by_account: byAccount,
  };
}

/**
 * Get status color for UI
 */
export function getStatusColor(
  status: 'on_track' | 'over_plan' | 'under_plan' | 'critical'
): string {
  switch (status) {
    case 'on_track':
      return 'green';
    case 'over_plan':
    case 'under_plan':
      return 'yellow';
    case 'critical':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Get status emoji for display
 */
export function getStatusEmoji(
  status: 'on_track' | 'over_plan' | 'under_plan' | 'critical'
): string {
  switch (status) {
    case 'on_track':
      return '🟢';
    case 'over_plan':
    case 'under_plan':
      return '🟡';
    case 'critical':
      return '🔴';
    default:
      return '⚪';
  }
}
