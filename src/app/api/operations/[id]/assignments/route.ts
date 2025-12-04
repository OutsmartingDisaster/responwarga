import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import { CreateAssignmentRequest } from '@/types/operations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/operations/[id]/assignments - List assignments in operation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        ra.*,
        er.full_name as report_name,
        er.description as report_description,
        er.assistance_type as report_type,
        er.latitude as report_lat,
        er.longitude as report_lng,
        er.photo_url as report_photo,
        assignee.full_name as assignee_name,
        assignee.phone as assignee_phone,
        assigner.full_name as assigner_name
      FROM report_assignments ra
      JOIN emergency_reports er ON er.id = ra.report_id
      JOIN profiles assignee ON assignee.user_id = ra.assigned_to
      JOIN profiles assigner ON assigner.user_id = ra.assigned_by
      WHERE ra.response_operation_id = $1
    `;
    const params_arr: any[] = [id];
    let paramIndex = 2;

    if (status) {
      sql += ` AND ra.status = $${paramIndex++}`;
      params_arr.push(status);
    }

    sql += ' ORDER BY ra.assigned_at DESC';

    const result = await query(sql, params_arr);

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/operations/[id]/assignments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/operations/[id]/assignments - Create assignment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only org_admin can create assignments
    if (user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateAssignmentRequest = await request.json();

    // Validate required fields
    if (!body.report_id || !body.assigned_to) {
      return NextResponse.json({ error: 'report_id and assigned_to are required' }, { status: 400 });
    }

    // Check if assignee is a team member
    const memberResult = await query(
      'SELECT id FROM response_team_members WHERE response_operation_id = $1 AND user_id = $2 AND status = $3',
      [id, body.assigned_to, 'accepted']
    );

    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Assignee is not a member of this operation' }, { status: 400 });
    }

    // Check if report is already assigned to this user
    const existingResult = await query(
      'SELECT id FROM report_assignments WHERE report_id = $1 AND assigned_to = $2',
      [body.report_id, body.assigned_to]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'Report already assigned to this user' }, { status: 400 });
    }

    // Insert assignment
    const reportType = (body as any).report_type || 'emergency_report';
    const result = await query(
      `INSERT INTO report_assignments (
        report_id, report_type, response_operation_id, assigned_to, assigned_by, priority, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        body.report_id,
        reportType,
        id,
        body.assigned_to,
        user.id,
        body.priority || 'normal',
        body.notes || null
      ]
    );

    // Update report dispatch status based on type
    if (reportType === 'emergency_report') {
      await query(`UPDATE emergency_reports SET dispatch_status = 'assigned' WHERE id = $1`, [body.report_id]);
    } else {
      await query(`UPDATE community_contributions SET status = 'assigned' WHERE id = $1`, [body.report_id]);
    }

    // Notify assignee
    await query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, 'new_assignment', $2, $3, 'report_assignment', $4)`,
      [
        body.assigned_to,
        'Tugas Baru',
        'Anda mendapat tugas baru untuk merespon laporan warga',
        result.rows[0].id
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/operations/[id]/assignments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
