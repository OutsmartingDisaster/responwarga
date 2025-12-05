import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/org/stats - Organization-level stats for org admins
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0 || !profileResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const orgId = profileResult.rows[0].organization_id;

    // Get org info
    const orgResult = await query('SELECT name, slug FROM organizations WHERE id = $1', [orgId]);
    const org = orgResult.rows[0];

    // Get incident stats
    const incidentStats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE incident_status = 'open') as open_count,
        COUNT(*) FILTER (WHERE incident_status = 'in_review') as in_review_count,
        COUNT(*) FILTER (WHERE incident_status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
      FROM incident_events
      WHERE organization_id = $1
    `, [orgId]);

    // Get responder stats
    const responderStats = await query(`
      SELECT 
        COUNT(*) as total_responders,
        COUNT(*) FILTER (WHERE status = 'active') as active_responders,
        COUNT(*) FILTER (WHERE status = 'on_duty') as on_duty_responders
      FROM profiles
      WHERE organization_id = $1 AND role IN ('responder', 'org_responder')
    `, [orgId]);

    // Get assignment stats
    const assignmentStats = await query(`
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(*) FILTER (WHERE status = 'assigned') as pending_assignments,
        COUNT(*) FILTER (WHERE status = 'in_progress') as active_assignments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_assignments,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '7 days') as completed_7d
      FROM assignments
      WHERE organization_id = $1
    `, [orgId]);

    // Get daily trend (last 7 days)
    const dailyTrend = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE incident_status = 'resolved') as resolved_count
      FROM incident_events
      WHERE organization_id = $1 AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [orgId]);

    return NextResponse.json({
      data: {
        organization: org,
        incidents: incidentStats.rows[0],
        responders: responderStats.rows[0],
        assignments: assignmentStats.rows[0],
        dailyTrend: dailyTrend.rows,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('GET /api/org/stats error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
