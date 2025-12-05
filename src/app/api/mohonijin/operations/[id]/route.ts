import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/mohonijin/operations/[id] - Get operation details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get operation details
    const opResult = await query(`
      SELECT 
        ro.*,
        o.name as organization_name,
        o.slug as organization_slug,
        p.full_name as created_by_name
      FROM response_operations ro
      JOIN organizations o ON o.id = ro.organization_id
      LEFT JOIN profiles p ON p.user_id = ro.created_by
      WHERE ro.id = $1
    `, [id]);

    if (opResult.rows.length === 0) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    const operation = opResult.rows[0];

    // Get team members
    const teamResult = await query(`
      SELECT 
        rtm.*,
        p.full_name,
        p.phone,
        p.role as profile_role
      FROM response_team_members rtm
      JOIN profiles p ON p.user_id = rtm.user_id
      WHERE rtm.response_operation_id = $1
      ORDER BY rtm.joined_at DESC
    `, [id]);

    // Get assignments
    const assignmentsResult = await query(`
      SELECT 
        ra.*,
        er.full_name as report_name,
        er.description as report_description,
        er.assistance_type,
        er.latitude as report_lat,
        er.longitude as report_lng,
        assignee.full_name as assignee_name
      FROM report_assignments ra
      JOIN emergency_reports er ON er.id = ra.report_id
      LEFT JOIN profiles assignee ON assignee.user_id = ra.assigned_to
      WHERE ra.response_operation_id = $1
      ORDER BY ra.assigned_at DESC
      LIMIT 50
    `, [id]);

    // Get stats
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM response_team_members WHERE response_operation_id = $1) as total_team,
        (SELECT COUNT(*) FROM response_team_members WHERE response_operation_id = $1 AND status = 'accepted') as active_team,
        (SELECT COUNT(*) FROM report_assignments WHERE response_operation_id = $1) as total_assignments,
        (SELECT COUNT(*) FROM report_assignments WHERE response_operation_id = $1 AND status = 'completed') as completed_assignments,
        (SELECT COUNT(*) FROM report_assignments WHERE response_operation_id = $1 AND status = 'in_progress') as active_assignments
    `, [id]);

    return NextResponse.json({
      data: {
        ...operation,
        team: teamResult.rows,
        assignments: assignmentsResult.rows,
        stats: statsResult.rows[0]
      }
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/operations/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/mohonijin/operations/[id] - Update operation status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (status && !['active', 'completed', 'suspended', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await query(
      `UPDATE response_operations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/mohonijin/operations/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
