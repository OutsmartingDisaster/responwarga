import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

// GET /api/health - System health check endpoint
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: Record<string, { status: 'ok' | 'error'; latency?: number; message?: string }> = {};

  // Database check
  try {
    const dbStart = Date.now();
    await query('SELECT 1');
    checks.database = { status: 'ok', latency: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: 'error', message: err.message };
  }

  // Get basic stats
  let stats = {};
  try {
    const [incidentCount, orgCount, userCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM incident_events'),
      query('SELECT COUNT(*) as count FROM organizations WHERE status = $1', ['active']),
      query('SELECT COUNT(*) as count FROM profiles'),
    ]);
    stats = {
      incidents: parseInt(incidentCount.rows[0]?.count || '0'),
      organizations: parseInt(orgCount.rows[0]?.count || '0'),
      users: parseInt(userCount.rows[0]?.count || '0'),
    };
  } catch (err) {
    // Stats are optional
  }

  // Overall status
  const allOk = Object.values(checks).every(c => c.status === 'ok');
  const totalLatency = Date.now() - startTime;

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    latency_ms: totalLatency,
    checks,
    stats,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }, { status: allOk ? 200 : 503 });
}
