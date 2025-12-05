import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/mohonijin/stats - Global situation stats for super admin
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get incident stats from unified view
    const incidentStats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE incident_status = 'open') as open_count,
        COUNT(*) FILTER (WHERE incident_status = 'in_review') as in_review_count,
        COUNT(*) FILTER (WHERE incident_status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d
      FROM incident_events
    `);

    // Get incidents by disaster type
    const byDisasterType = await query(`
      SELECT disaster_type, COUNT(*) as count
      FROM incident_events
      WHERE disaster_type IS NOT NULL
      GROUP BY disaster_type
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get organization count
    const orgStats = await query(`
      SELECT 
        COUNT(*) as total_orgs,
        COUNT(*) as active_orgs
      FROM organizations
    `);

    // Get responder stats
    const responderStats = await query(`
      SELECT 
        COUNT(*) as total_responders,
        COUNT(*) FILTER (WHERE status = 'active') as active_responders,
        COUNT(*) FILTER (WHERE status = 'on_duty') as on_duty_responders
      FROM profiles
      WHERE role IN ('responder', 'org_responder')
    `);

    // Get assignment stats
    const assignmentStats = await query(`
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(*) FILTER (WHERE status = 'assigned') as pending_assignments,
        COUNT(*) FILTER (WHERE status = 'in_progress') as active_assignments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_assignments,
        COUNT(*) FILTER (WHERE assigned_at > NOW() - INTERVAL '24 hours') as assigned_last_24h
      FROM assignments
    `);

    // Get incidents by province (top 10) - get last part of comma-separated location
    const byProvince = await query(`
      SELECT 
        COALESCE(
          TRIM(SPLIT_PART(location_name, ',', ARRAY_LENGTH(STRING_TO_ARRAY(location_name, ','), 1))),
          'Unknown'
        ) as province,
        COUNT(*) as count
      FROM incident_events
      WHERE location_name IS NOT NULL AND location_name != ''
      GROUP BY province
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get daily incident trend (last 14 days)
    const dailyTrend = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE incident_status = 'open') as open_count,
        COUNT(*) FILTER (WHERE incident_status = 'resolved') as resolved_count
      FROM incident_events
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    return NextResponse.json({
      data: {
        incidents: incidentStats.rows[0],
        byDisasterType: byDisasterType.rows,
        byProvince: byProvince.rows,
        dailyTrend: dailyTrend.rows,
        organizations: orgStats.rows[0],
        responders: responderStats.rows[0],
        assignments: assignmentStats.rows[0],
        generated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/stats error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
