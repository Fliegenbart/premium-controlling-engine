/**
 * Health Check API
 * GET /api/health
 * 
 * Used by Docker healthcheck and load balancers
 */

import { NextResponse } from 'next/server';
import { getConnection, initDatabase } from '@/lib/duckdb-engine';

export async function GET(): Promise<NextResponse> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    checks: {
      server: true,
      database: false,
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      }
    }
  };
  
  try {
    // Check DuckDB
    await initDatabase(process.env.DATABASE_PATH);
    const conn = await getConnection();
    await conn.run('SELECT 1');
    health.checks.database = true;
  } catch (e) {
    health.checks.database = false;
    health.status = 'degraded';
  }
  
  // Memory stats
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024),
    total: Math.round(memUsage.heapTotal / 1024 / 1024),
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
  };
  
  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(health, { status: statusCode });
}
