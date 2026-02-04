/**
 * SQL Query API
 * POST /api/query
 * 
 * Execute SQL queries directly on DuckDB
 * Used by the agent for tool calling
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeSQL, initDatabase } from '@/lib/duckdb-engine';
import { SQLQueryRequest, SQLQueryResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<SQLQueryResponse>> {
  try {
    const body: SQLQueryRequest = await request.json();
    const { sql, explain } = body;
    
    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: 'SQL Query ist erforderlich'
      }, { status: 400 });
    }
    
    // Initialize DuckDB if needed
    await initDatabase(process.env.DATABASE_PATH);
    
    // Optionally explain the query first
    if (explain) {
      try {
        const explainResult = await executeSQL(`EXPLAIN ${sql}`);
        console.log('Query Plan:', explainResult.rows);
      } catch (e) {
        // Non-critical
      }
    }
    
    // Execute the query
    const result = await executeSQL(sql);
    
    return NextResponse.json({
      success: true,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs
    });
    
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json({
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// GET endpoint for simple queries via URL params
export async function GET(request: NextRequest): Promise<NextResponse<SQLQueryResponse>> {
  const sql = request.nextUrl.searchParams.get('sql');
  
  if (!sql) {
    return NextResponse.json({
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: 'SQL Parameter fehlt'
    }, { status: 400 });
  }
  
  // Initialize and execute
  await initDatabase(process.env.DATABASE_PATH);
  
  try {
    const result = await executeSQL(sql);
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: (error as Error).message
    }, { status: 500 });
  }
}
