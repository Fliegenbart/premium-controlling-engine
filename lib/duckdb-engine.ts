/**
 * DuckDB Data Engine - Core of Premium Controlling
 *
 * Provides SQL-based analytics on booking data with:
 * - Automatic schema inference
 * - Data profiling & quality checks
 * - Variance decomposition
 * - Time series analysis
 */

import * as duckdb from 'duckdb';
import { Booking, DataProfile, VarianceResult, TimeSeriesPoint } from './types';

// Singleton DuckDB instance
let db: duckdb.Database | null = null;

/**
 * Initialize DuckDB with in-memory database
 */
export async function initDatabase(persistPath?: string): Promise<void> {
  if (db) return;

  return new Promise((resolve, reject) => {
    db = new duckdb.Database(persistPath || ':memory:', (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create core schemas
      db!.run(
        `
        CREATE SCHEMA IF NOT EXISTS controlling;
        CREATE SCHEMA IF NOT EXISTS staging;
        CREATE SCHEMA IF NOT EXISTS analysis;
      `,
        (err) => {
          if (err) reject(err);
          else {
            console.log('DuckDB initialized successfully');
            resolve();
          }
        }
      );
    });
  });
}

/**
 * Get database instance (auto-init if needed)
 */
export async function getDatabase(): Promise<duckdb.Database> {
  if (!db) {
    await initDatabase();
  }
  return db!;
}

/**
 * Execute SQL and return rows
 */
export async function executeSQL(sql: string): Promise<{
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}> {
  const database = await getDatabase();
  const start = Date.now();

  // Basic SQL injection prevention
  const sanitized = sql.trim().toLowerCase();
  if (
    sanitized.includes('drop') ||
    sanitized.includes('delete') ||
    sanitized.includes('truncate')
  ) {
    throw new Error('Destructive operations not allowed');
  }

  return new Promise((resolve, reject) => {
    database.all(sql, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const result = rows as Record<string, unknown>[];
      resolve({
        columns: result.length > 0 ? Object.keys(result[0]) : [],
        rows: result,
        rowCount: result.length,
        executionTimeMs: Date.now() - start,
      });
    });
  });
}

/**
 * Run SQL without returning results
 */
async function runSQL(sql: string): Promise<void> {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    database.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Load bookings into DuckDB from parsed data
 */
export async function loadBookings(
  bookings: Booking[],
  tableName: string,
  schema: string = 'controlling'
): Promise<{ rowCount: number; profile: DataProfile }> {
  const fullTableName = `${schema}.${tableName}`;

  // Drop existing table
  await runSQL(`DROP TABLE IF EXISTS ${fullTableName}`);

  // Create table
  await runSQL(`
    CREATE TABLE ${fullTableName} (
      id INTEGER,
      posting_date DATE,
      amount DECIMAL(18,2),
      account INTEGER,
      account_name VARCHAR,
      cost_center VARCHAR,
      profit_center VARCHAR,
      vendor VARCHAR,
      customer VARCHAR,
      document_no VARCHAR,
      text VARCHAR
    )
  `);

  // Insert in batches using VALUES
  const batchSize = 100;
  for (let i = 0; i < bookings.length; i += batchSize) {
    const batch = bookings.slice(i, i + batchSize);
    const values = batch
      .map((b, idx) => {
        const id = i + idx + 1;
        const date = b.posting_date ? `'${b.posting_date}'` : 'NULL';
        const amount = b.amount || 0;
        const account = b.account || 0;
        const accountName = escape(b.account_name || '');
        const costCenter = b.cost_center ? `'${escape(b.cost_center)}'` : 'NULL';
        const profitCenter = b.profit_center ? `'${escape(b.profit_center)}'` : 'NULL';
        const vendor = b.vendor ? `'${escape(b.vendor)}'` : 'NULL';
        const customer = b.customer ? `'${escape(b.customer)}'` : 'NULL';
        const docNo = escape(b.document_no || '');
        const text = escape(b.text || '');

        return `(${id}, ${date}, ${amount}, ${account}, '${accountName}', ${costCenter}, ${profitCenter}, ${vendor}, ${customer}, '${docNo}', '${text}')`;
      })
      .join(',\n');

    await runSQL(`INSERT INTO ${fullTableName} VALUES ${values}`);
  }

  // Generate profile
  const profile = await profileTable(fullTableName);

  return {
    rowCount: bookings.length,
    profile,
  };
}

function escape(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

/**
 * Profile a table for data quality
 */
export async function profileTable(tableName: string): Promise<DataProfile> {
  const statsResult = await executeSQL(`
    SELECT
      COUNT(*) as row_count,
      COUNT(DISTINCT account) as unique_accounts,
      COUNT(DISTINCT cost_center) as unique_cost_centers,
      COUNT(DISTINCT document_no) as unique_documents,
      MIN(posting_date) as min_date,
      MAX(posting_date) as max_date,
      SUM(amount) as total_amount,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_credits,
      SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_debits,
      COUNT(CASE WHEN amount IS NULL THEN 1 END) as null_amounts,
      COUNT(CASE WHEN posting_date IS NULL THEN 1 END) as null_dates,
      COUNT(CASE WHEN account IS NULL THEN 1 END) as null_accounts
    FROM ${tableName}
  `);

  const s = statsResult.rows[0] as Record<string, unknown>;

  // Duplicate check
  const dupResult = await executeSQL(`
    SELECT document_no, COUNT(*) as cnt
    FROM ${tableName}
    GROUP BY document_no
    HAVING COUNT(*) > 1
    LIMIT 10
  `);

  // Outlier detection (simplified)
  const outlierResult = await executeSQL(`
    SELECT COUNT(*) as outlier_count
    FROM ${tableName}
    WHERE ABS(amount) > (SELECT AVG(ABS(amount)) + 3 * STDDEV(ABS(amount)) FROM ${tableName})
  `);

  const warnings: string[] = [];
  if (Number(s.null_amounts) > 0) {
    warnings.push(`${s.null_amounts} Buchungen ohne Betrag`);
  }
  if (Number(s.null_dates) > 0) {
    warnings.push(`${s.null_dates} Buchungen ohne Datum`);
  }
  if (dupResult.rows.length > 0) {
    warnings.push(`${dupResult.rows.length} doppelte Belegnummern gefunden`);
  }

  return {
    rowCount: Number(s.row_count),
    uniqueAccounts: Number(s.unique_accounts),
    uniqueCostCenters: Number(s.unique_cost_centers),
    uniqueDocuments: Number(s.unique_documents),
    dateRange: {
      min: String(s.min_date || ''),
      max: String(s.max_date || ''),
    },
    totals: {
      all: Number(s.total_amount) || 0,
      credits: Number(s.total_credits) || 0,
      debits: Number(s.total_debits) || 0,
      balanced: Math.abs(Number(s.total_credits) + Number(s.total_debits)) < 0.01,
    },
    quality: {
      nullAmounts: Number(s.null_amounts),
      nullDates: Number(s.null_dates),
      nullAccounts: Number(s.null_accounts),
      duplicateDocuments: dupResult.rows.length,
      outlierCount: Number((outlierResult.rows[0] as Record<string, unknown>).outlier_count),
    },
    warnings,
  };
}

/**
 * Execute variance analysis between two periods
 */
export async function analyzeVariance(
  tablePrev: string,
  tableCurr: string
): Promise<VarianceResult[]> {
  const result = await executeSQL(`
    WITH prev AS (
      SELECT account, account_name, SUM(amount) as amount_prev, COUNT(*) as count_prev
      FROM ${tablePrev}
      GROUP BY account, account_name
    ),
    curr AS (
      SELECT account, account_name, SUM(amount) as amount_curr, COUNT(*) as count_curr
      FROM ${tableCurr}
      GROUP BY account, account_name
    )
    SELECT
      COALESCE(p.account, c.account) as account,
      COALESCE(p.account_name, c.account_name) as account_name,
      COALESCE(p.amount_prev, 0) as amount_prev,
      COALESCE(c.amount_curr, 0) as amount_curr,
      COALESCE(c.amount_curr, 0) - COALESCE(p.amount_prev, 0) as delta_abs,
      CASE
        WHEN COALESCE(p.amount_prev, 0) = 0 THEN
          CASE WHEN COALESCE(c.amount_curr, 0) = 0 THEN 0 ELSE 100 END
        ELSE (COALESCE(c.amount_curr, 0) - p.amount_prev) / ABS(p.amount_prev) * 100
      END as delta_pct,
      COALESCE(p.count_prev, 0) as bookings_prev,
      COALESCE(c.count_curr, 0) as bookings_curr
    FROM prev p
    FULL OUTER JOIN curr c ON p.account = c.account
    ORDER BY ABS(COALESCE(c.amount_curr, 0) - COALESCE(p.amount_prev, 0)) DESC
  `);

  return result.rows.map((row) => ({
    dimension: 'account',
    key: String(row.account),
    label: String(row.account_name),
    amountPrev: Number(row.amount_prev),
    amountCurr: Number(row.amount_curr),
    deltaAbs: Number(row.delta_abs),
    deltaPct: Number(row.delta_pct),
    bookingsPrev: Number(row.bookings_prev),
    bookingsCurr: Number(row.bookings_curr),
  }));
}

/**
 * Get top bookings for a specific account
 */
export async function getTopBookings(
  tableName: string,
  account: number,
  limit: number = 10
): Promise<Booking[]> {
  const result = await executeSQL(`
    SELECT *
    FROM ${tableName}
    WHERE account = ${account}
    ORDER BY ABS(amount) DESC
    LIMIT ${limit}
  `);

  return result.rows.map((r) => ({
    posting_date: String(r.posting_date),
    amount: Number(r.amount),
    account: Number(r.account),
    account_name: String(r.account_name),
    cost_center: r.cost_center ? String(r.cost_center) : undefined,
    profit_center: r.profit_center ? String(r.profit_center) : undefined,
    vendor: r.vendor ? String(r.vendor) : undefined,
    customer: r.customer ? String(r.customer) : undefined,
    document_no: String(r.document_no),
    text: String(r.text),
  }));
}

/**
 * Decompose variance by drivers
 */
export async function decomposeVariance(
  tablePrev: string,
  tableCurr: string,
  targetAccount: number,
  dimensions: string[] = ['vendor', 'cost_center', 'text']
): Promise<{
  totalVariance: number;
  drivers: Array<{
    dimension: string;
    key: string;
    contribution: number;
    contributionPct: number;
  }>;
}> {
  // Get total variance first
  const totalResult = await executeSQL(`
    WITH prev AS (SELECT SUM(amount) as total FROM ${tablePrev} WHERE account = ${targetAccount}),
         curr AS (SELECT SUM(amount) as total FROM ${tableCurr} WHERE account = ${targetAccount})
    SELECT COALESCE(curr.total, 0) - COALESCE(prev.total, 0) as variance
    FROM prev, curr
  `);
  const totalVariance = Number((totalResult.rows[0] as Record<string, unknown>).variance);

  const drivers: Array<{
    dimension: string;
    key: string;
    contribution: number;
    contributionPct: number;
  }> = [];

  // Analyze each dimension
  for (const dim of dimensions) {
    const dimResult = await executeSQL(`
      WITH prev AS (
        SELECT ${dim} as key, SUM(amount) as amount
        FROM ${tablePrev}
        WHERE account = ${targetAccount}
        GROUP BY ${dim}
      ),
      curr AS (
        SELECT ${dim} as key, SUM(amount) as amount
        FROM ${tableCurr}
        WHERE account = ${targetAccount}
        GROUP BY ${dim}
      )
      SELECT
        COALESCE(p.key, c.key) as key,
        COALESCE(c.amount, 0) - COALESCE(p.amount, 0) as contribution
      FROM prev p
      FULL OUTER JOIN curr c ON p.key = c.key
      WHERE ABS(COALESCE(c.amount, 0) - COALESCE(p.amount, 0)) > 0
      ORDER BY ABS(COALESCE(c.amount, 0) - COALESCE(p.amount, 0)) DESC
      LIMIT 5
    `);

    for (const row of dimResult.rows) {
      const contribution = Number(row.contribution);
      drivers.push({
        dimension: dim,
        key: String(row.key || '(leer)'),
        contribution,
        contributionPct: totalVariance !== 0 ? (contribution / totalVariance) * 100 : 0,
      });
    }
  }

  // Sort by absolute contribution
  drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    totalVariance,
    drivers: drivers.slice(0, 10),
  };
}

/**
 * Generate time series for forecasting
 */
export async function getTimeSeries(
  tableName: string,
  metric: 'amount' | 'count' = 'amount',
  groupBy: 'month' | 'quarter' = 'month'
): Promise<TimeSeriesPoint[]> {
  const dateGroup =
    groupBy === 'month'
      ? "DATE_TRUNC('month', posting_date)"
      : "DATE_TRUNC('quarter', posting_date)";

  const metricExpr = metric === 'amount' ? 'SUM(amount)' : 'COUNT(*)';

  const result = await executeSQL(`
    SELECT
      ${dateGroup} as period,
      ${metricExpr} as value,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT account) as unique_accounts
    FROM ${tableName}
    GROUP BY ${dateGroup}
    ORDER BY period
  `);

  return result.rows.map((r) => ({
    period: String(r.period),
    value: Number(r.value),
    transactionCount: Number(r.transaction_count),
    uniqueAccounts: Number(r.unique_accounts),
  }));
}

/**
 * Export to get connection for direct queries
 */
export async function getConnection(): Promise<duckdb.Database> {
  return getDatabase();
}

/**
 * Export table to Parquet file
 */
export async function exportToParquet(tableName: string, filePath: string): Promise<void> {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    database.run(`COPY ${tableName} TO '${filePath}' (FORMAT PARQUET)`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Close database
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}

// Alias for backward compatibility
export { executeSQL as runQuery };
