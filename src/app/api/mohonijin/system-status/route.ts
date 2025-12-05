import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/mohonijin/system-status - Detailed system status for super admins
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    // Database metrics
    const dbMetrics = await query(`
      SELECT 
        (SELECT COUNT(*) FROM incident_events) as total_incidents,
        (SELECT COUNT(*) FROM incident_events WHERE created_at > NOW() - INTERVAL '24 hours') as incidents_24h,
        (SELECT COUNT(*) FROM organizations WHERE status = 'active') as active_orgs,
        (SELECT COUNT(*) FROM profiles) as total_users,
        (SELECT COUNT(*) FROM profiles WHERE role IN ('responder', 'org_responder')) as total_responders,
        (SELECT COUNT(*) FROM assignments WHERE status IN ('assigned', 'in_progress')) as active_assignments,
        (SELECT COUNT(*) FROM api_keys WHERE is_active = true) as active_api_keys,
        (SELECT COUNT(*) FROM orthophotos WHERE status = 'ready') as ready_orthophotos
    `);

    // Recent activity
    const recentActivity = await query(`
      SELECT action, COUNT(*) as count
      FROM admin_audit_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);

    // API key usage (last 24h)
    const apiUsage = await query(`
      SELECT 
        SUM(usage_count) as total_requests,
        COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '24 hours') as active_keys_24h
      FROM api_keys
      WHERE is_active = true
    `);

    // Export history (last 7 days)
    const exportStats = await query(`
      SELECT 
        COUNT(*) as total_exports,
        SUM(record_count) as total_records_exported
      FROM export_history
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);

    // Processing queue status
    const queueStatus = await query(`
      SELECT status, COUNT(*) as count
      FROM orthophoto_processing_queue
      GROUP BY status
    `);

    return NextResponse.json({
      data: {
        metrics: dbMetrics.rows[0],
        recent_activity: recentActivity.rows,
        api_usage: apiUsage.rows[0],
        export_stats: exportStats.rows[0],
        processing_queue: queueStatus.rows,
        response_time_ms: Date.now() - startTime,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/system-status error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
