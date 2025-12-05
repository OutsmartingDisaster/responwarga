import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/mohonijin/incidents/[id] - Get incident details with assignments
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get incident from unified view
    const incidentResult = await query(
      `SELECT * FROM incident_events WHERE id = $1`,
      [id]
    );

    if (incidentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const incident = incidentResult.rows[0];

    // Get assignments for this incident
    const assignmentsResult = await query(
      `SELECT 
        a.*,
        p.full_name as assignee_name,
        p.phone as assignee_phone
      FROM assignments a
      LEFT JOIN profiles p ON p.user_id = a.responder_id
      WHERE a.emergency_report_id = $1 OR a.contribution_id = $1
      ORDER BY a.assigned_at DESC`,
      [id]
    );

    // Get organization info if available
    let organization = null;
    if (incident.organization_id) {
      const orgResult = await query(
        `SELECT id, name, slug FROM organizations WHERE id = $1`,
        [incident.organization_id]
      );
      organization = orgResult.rows[0] || null;
    }

    return NextResponse.json({
      data: {
        ...incident,
        organization,
        assignments: assignmentsResult.rows,
      }
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/incidents/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
