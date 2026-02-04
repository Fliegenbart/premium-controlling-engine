/**
 * DuckDB Data Engine - Core of Premium Controlling
 * 
 * Provides SQL-based analytics on booking data with:
 * - Automatic schema inference
 * - Data profiling & quality checks
 * - Variance decomposition
 * - Time series analysis
 */

import * as duckdb from '@duckdb/node-api';
import { Booking, DataProfile, VarianceResult, TimeSeriesPoint } from './types';

// Singleton DuckDB instance
let db: duckdb.Database | null = null;
let connection: duckdb.Connection | null = null;

/**
 * Initialize DuckDB with in-memory database
 * Persists to disk for session continuity
 */
export async function initDatabase(persistPath?: string): Promise<void> {
  if (db) return;
  
  const instance = await duckdb.createDatabase(persistPath || ':memory:');
  db = instance;
  connection = await db.connect();
  
  // Enable extensions
  await connection.run("INSTALL 'parquet'; LOAD 'parquet';");
  
  // Create core schemas
  await connection.run(`
    CREATE SCHEMA IF NOT EXISTS controlling;
    CREATE SCHEMA IF NOT EXISTS staging;
    CREATE SCHEMA IF NOT EXISTS analysis;
  `);
  
  console.log('DuckDB initialized successfully');
}

/**
 * Get database connection (auto-init if needed)
 */
export async function getConnection(): Promise<duckdb.Connection> {
  if (!connection) {
    await initDatabase();
  }
  return connection!;
}

/**
 * Load bookings into DuckDB from parsed data
 */
export async function loadBookings(
  bookings: Booking[],
  tableName: string,
  schema: string = 'controlling'
): Promise<{ rowCount: number; profile: DataProfile }> {
  const conn = await getConnection();
  const fullTableName = `${schema}.${tableName}`;
  
  // Drop existing table
  await conn.run(`DROP TABLE IF EXISTS ${fullTableName}`);
  
  // Create table with proper types
  await conn.run(`
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
      text VARCHAR,
      -- Computed columns
      year INTEGER AS (YEAR(posting_date)),
      month INTEGER AS (MONTH(posting_date)),
      quarter INTEGER AS (QUARTER(posting_date)),
      is_expense BOOLEAN AS (account >= 5000),
      is_revenue BOOLEAN AS (account < 5000)
    )
  `);
  
  // Prepare insert statement
  const stmt = await conn.prepare(`
    INSERT INTO ${fullTableName} 
    (id, posting_date, amount, account, account_name, cost_center, profit_center, vendor, customer, document_no, text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Insert in batches
  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    await stmt.run([
      i + 1,
      b.posting_date,
      b.amount,
      b.account,
      b.account_name,
      b.cost_center || null,
      b.profit_center || null,
      b.vendor || null,
      b.customer || null,
      b.document_no,
      b.text
    ]);
  }
  
  // Generate profile
  const profile = await profileTable(fullTableName);
  
  return {
    rowCount: bookings.length,
    profile
  };
}

/**
 * Profile a table for data quality
 */
export async function profileTable(tableName: string): Promise<DataProfile> {
  const conn = await getConnection();
  
  // Basic stats
  const statsResult = await conn.run(`
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
  
  const stats = await statsResult.fetchAllRows();
  const s = stats[0] as Record<string, unknown>;
  
  // Duplicate check
  const dupResult = await conn.run(`
    SELECT document_no, COUNT(*) as cnt
    FROM ${tableName}
    GROUP BY document_no
    HAVING COUNT(*) > 1
    LIMIT 10
  `);
  const duplicates = await dupResult.fetchAllRows();
  
  // Outlier detection (using IQR method)
  const outlierResult = await conn.run(`
    WITH stats AS (
      SELECT 
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ABS(amount)) as q1,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ABS(amount)) as q3
      FROM ${tableName}
    )
    SELECT COUNT(*) as outlier_count
    FROM ${tableName}, stats
    WHERE ABS(amount) > q3 + 1.5 * (q3 - q1)
       OR ABS(amount) < q1 - 1.5 * (q3 - q1)
  `);
  const outliers = await outlierResult.fetchAllRows();
  
  return {
    rowCount: Number(s.row_count),
    uniqueAccounts: Number(s.unique_accounts),
    uniqueCostCenters: Number(s.unique_cost_centers),
    uniqueDocuments: Number(s.unique_documents),
    dateRange: {
      min: String(s.min_date),
      max: String(s.max_date)
    },
    totals: {
      all: Number(s.total_amount),
      credits: Number(s.total_credits),
      debits: Number(s.total_debits),
      balanced: Math.abs(Number(s.total_credits) + Number(s.total_debits)) < 0.01
    },
    quality: {
      nullAmounts: Number(s.null_amounts),
      nullDates: Number(s.null_dates),
      nullAccounts: Number(s.null_accounts),
      duplicateDocuments: duplicates.length,
      outlierCount: Number((outliers[0] as Record<string, unknown>).outlier_count)
    },
    warnings: generateWarnings(s, duplicates)
  };
}

function generateWarnings(stats: Record<string, unknown>, duplicates: unknown[]): string[] {
  const warnings: string[] = [];
  
  if (Number(stats.null_amounts) > 0) {
    warnings.push(`${stats.null_amounts} Buchungen ohne Betrag`);
  }
  if (Number(stats.null_dates) > 0) {
    warnings.push(`${stats.null_dates} Buchungen ohne Datum`);
  }
  if (duplicates.length > 0) {
    warnings.push(`${duplicates.length} doppelte Belegnummern gefunden`);
  }
  if (!stats.total_amount || Math.abs(Number(stats.total_credits) + Number(stats.total_debits)) > 0.01) {
    // This is expected for P&L, not a warning
  }
  
  return warnings;
}

/**
 * Execute variance analysis between two periods
 */
export async function analyzeVariance(
  tablePrev: string,
  tableCurr: string,
  dimensions: string[] = ['account', 'cost_center']
): Promise<VarianceResult[]> {
  const conn = await getConnection();
  
  const results: VarianceResult[] = [];
  
  // Account-level variance
  const accountVariance = await conn.run(`
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
  
  const rows = await accountVariance.fetchAllRows();
  
  for (const row of rows as Record<string, unknown>[]) {
    results.push({
      dimension: 'account',
      key: String(row.account),
      label: String(row.account_name),
      amountPrev: Number(row.amount_prev),
      amountCurr: Number(row.amount_curr),
      deltaAbs: Number(row.delta_abs),
      deltaPct: Number(row.delta_pct),
      bookingsPrev: Number(row.bookings_prev),
      bookingsCurr: Number(row.bookings_curr)
    });
  }
  
  return results;
}

/**
 * Get top bookings for a specific account
 */
export async function getTopBookings(
  tableName: string,
  account: number,
  limit: number = 10
): Promise<Booking[]> {
  const conn = await getConnection();
  
  const result = await conn.run(`
    SELECT *
    FROM ${tableName}
    WHERE account = ${account}
    ORDER BY ABS(amount) DESC
    LIMIT ${limit}
  `);
  
  const rows = await result.fetchAllRows();
  return rows.map((r: Record<string, unknown>) => ({
    posting_date: String(r.posting_date),
    amount: Number(r.amount),
    account: Number(r.account),
    account_name: String(r.account_name),
    cost_center: r.cost_center ? String(r.cost_center) : undefined,
    profit_center: r.profit_center ? String(r.profit_center) : undefined,
    vendor: r.vendor ? String(r.vendor) : undefined,
    customer: r.customer ? String(r.customer) : undefined,
    document_no: String(r.document_no),
    text: String(r.text)
  }));
}

/**
 * Execute custom SQL query (for agent tool calling)
 */
export async function executeSQL(sql: string): Promise<{
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}> {
  const conn = await getConnection();
  const start = Date.now();
  
  // Validate SQL (basic safety)
  const sanitized = sql.trim().toLowerCase();
  if (sanitized.includes('drop') || sanitized.includes('delete') || sanitized.includes('truncate')) {
    throw new Error('Destructive operations not allowed');
  }
  
  const result = await conn.run(sql);
  const rows = await result.fetchAllRows() as Record<string, unknown>[];
  
  return {
    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    rows,
    rowCount: rows.length,
    executionTimeMs: Date.now() - start
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
  const conn = await getConnection();
  
  const dateGroup = groupBy === 'month' 
    ? "DATE_TRUNC('month', posting_date)"
    : "DATE_TRUNC('quarter', posting_date)";
  
  const metricExpr = metric === 'amount' ? 'SUM(amount)' : 'COUNT(*)';
  
  const result = await conn.run(`
    SELECT 
      ${dateGroup} as period,
      ${metricExpr} as value,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT account) as unique_accounts
    FROM ${tableName}
    GROUP BY ${dateGroup}
    ORDER BY period
  `);
  
  const rows = await result.fetchAllRows();
  return rows.map((r: Record<string, unknown>) => ({
    period: String(r.period),
    value: Number(r.value),
    transactionCount: Number(r.transaction_count),
    uniqueAccounts: Number(r.unique_accounts)
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
  const conn = await getConnection();
  
  // Get total variance first
  const totalResult = await conn.run(`
    WITH prev AS (SELECT SUM(amount) as total FROM ${tablePrev} WHERE account = ${targetAccount}),
         curr AS (SELECT SUM(amount) as total FROM ${tableCurr} WHERE account = ${targetAccount})
    SELECT COALESCE(curr.total, 0) - COALESCE(prev.total, 0) as variance
    FROM prev, curr
  `);
  const totalRow = (await totalResult.fetchAllRows())[0] as Record<string, unknown>;
  const totalVariance = Number(totalRow.variance);
  
  const drivers: Array<{
    dimension: string;
    key: string;
    contribution: number;
    contributionPct: number;
  }> = [];
  
  // Analyze each dimension
  for (const dim of dimensions) {
    const dimResult = await conn.run(`
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
    
    const dimRows = await dimResult.fetchAllRows();
    for (const row of dimRows as Record<string, unknown>[]) {
      const contribution = Number(row.contribution);
      drivers.push({
        dimension: dim,
        key: String(row.key || '(leer)'),
        contribution,
        contributionPct: totalVariance !== 0 ? (contribution / totalVariance) * 100 : 0
      });
    }
  }
  
  // Sort by absolute contribution
  drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  
  return {
    totalVariance,
    drivers: drivers.slice(0, 10)
  };
}

/**
 * Export table to Parquet for persistence
 */
export async function exportToParquet(tableName: string, outputPath: string): Promise<void> {
  const conn = await getConnection();
  await conn.run(`COPY ${tableName} TO '${outputPath}' (FORMAT PARQUET, COMPRESSION 'ZSTD')`);
}

/**
 * Import from Parquet
 */
export async function importFromParquet(inputPath: string, tableName: string): Promise<number> {
  const conn = await getConnection();
  await conn.run(`CREATE TABLE ${tableName} AS SELECT * FROM read_parquet('${inputPath}')`);
  
  const countResult = await conn.run(`SELECT COUNT(*) as cnt FROM ${tableName}`);
  const countRow = (await countResult.fetchAllRows())[0] as Record<string, unknown>;
  return Number(countRow.cnt);
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
  if (db) {
    await db.close();
    db = null;
  }
}
