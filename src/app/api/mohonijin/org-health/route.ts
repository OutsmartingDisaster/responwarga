import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/mohonijin/org-health - Organization health indicators
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization health metrics
    const orgHealth = await query(`
      SELECT 
        o.id,
        o.name,
        o.slug,
        'active' as status,
        o.created_at,
        -- Responder counts
        (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id AND p.role IN ('responder', 'org_responder')) as total_responders,
        (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id AND p.role IN ('responder', 'org_responder') AND p.status = 'active') as active_responders,
        -- Assignment metrics
        (SELECT COUNT(*) FROM assignments a WHERE a.organization_id = o.id AND a.status IN ('assigned', 'in_progress')) as open_tasks,
        (SELECT COUNT(*) FROM assignments a WHERE a.organization_id = o.id AND a.status = 'completed' AND a.completed_at > NOW() - INTERVAL '7 days') as completed_7d,
        -- Incident backlog (emergency reports linked to org)
        (SELECT COUNT(*) FROM emergency_reports er WHERE er.assigned_organization_id = o.id AND er.dispatch_status IN ('unassigned', 'dispatched')) as incident_backlog,
        -- Last activity
        (SELECT MAX(p.updated_at) FROM profiles p WHERE p.organization_id = o.id) as last_profile_activity,
        (SELECT MAX(a.assigned_at) FROM assignments a WHERE a.organization_id = o.id) as last_assignment,
        -- Response operations
        (SELECT COUNT(*) FROM response_operations ro WHERE ro.organization_id = o.id AND ro.status = 'active') as active_operations
      FROM organizations o
      ORDER BY o.name
    `);

    // Calculate health scores and flags
    const healthData = orgHealth.rows.map(org => {
      const flags: string[] = [];
      let healthScore = 100;

      // Check for issues
      if (org.active_responders === 0) {
        flags.push('no_active_responders');
        healthScore -= 30;
      }
      if (org.incident_backlog > 10) {
        flags.push('high_backlog');
        healthScore -= 20;
      }
      if (org.open_tasks > org.active_responders * 5) {
        flags.push('overloaded');
        healthScore -= 15;
      }
      
      // Check for stale activity (no activity in 7 days)
      const lastActivity = org.last_assignment || org.last_profile_activity;
      if (lastActivity) {
        const daysSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 7) {
          flags.push('inactive');
          healthScore -= 15;
        }
      } else {
        flags.push('no_activity');
        healthScore -= 10;
      }

      // Determine health status
      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (healthScore < 50) healthStatus = 'critical';
      else if (healthScore < 75) healthStatus = 'warning';

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        metrics: {
          total_responders: parseInt(org.total_responders) || 0,
          active_responders: parseInt(org.active_responders) || 0,
          open_tasks: parseInt(org.open_tasks) || 0,
          completed_7d: parseInt(org.completed_7d) || 0,
          incident_backlog: parseInt(org.incident_backlog) || 0,
          active_operations: parseInt(org.active_operations) || 0,
        },
        last_activity: lastActivity,
        health_score: Math.max(0, healthScore),
        health_status: healthStatus,
        flags,
      };
    });

    // Summary stats
    const summary = {
      total_orgs: healthData.length,
      healthy: healthData.filter(o => o.health_status === 'healthy').length,
      warning: healthData.filter(o => o.health_status === 'warning').length,
      critical: healthData.filter(o => o.health_status === 'critical').length,
    };

    return NextResponse.json({
      data: {
        summary,
        organizations: healthData,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/org-health error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
