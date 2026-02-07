/**
 * Health Check API
 * GET /api/health
 * 
 * Used by Docker healthcheck and load balancers
 */

import { NextResponse } from 'next/server';
import { getConnection, initDatabase } from '@/lib/duckdb-engine';
import os from 'os';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getMemoryLimitBytes(): Promise<number | null> {
  // Prefer cgroup v2 (Docker default on modern distros).
  try {
    const raw = (await fs.readFile('/sys/fs/cgroup/memory.max', 'utf8')).trim();
    if (!raw || raw === 'max') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    // Fallback: cgroup v1.
    try {
      const raw = (await fs.readFile('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8')).trim();
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }
}

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
        percentage: 0,
        rss: 0,
        heapUsed: 0,
        heapTotal: 0,
        limit: 0,
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
  
  // Memory stats (RSS + cgroup limit when available).
  const memUsage = process.memoryUsage();
  const rssMb = Math.round(memUsage.rss / 1024 / 1024);
  const heapUsedMb = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(memUsage.heapTotal / 1024 / 1024);
  const limitBytes = await getMemoryLimitBytes();
  const totalBytes = limitBytes ?? os.totalmem();
  const totalMb = Math.round(totalBytes / 1024 / 1024);
  const pct = totalBytes > 0 ? Math.round((memUsage.rss / totalBytes) * 100) : 0;

  health.checks.memory = {
    // Backwards-compatible summary fields
    used: rssMb,
    total: totalMb,
    percentage: pct,

    // Detailed fields
    rss: rssMb,
    heapUsed: heapUsedMb,
    heapTotal: heapTotalMb,
    limit: limitBytes ? Math.round(limitBytes / 1024 / 1024) : 0,
  };
  
  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(health, { status: statusCode });
}
