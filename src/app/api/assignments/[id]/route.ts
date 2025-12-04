import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import { UpdateAssignmentRequest } from '@/types/operations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/assignments/[id] - Get assignment detail
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT 
        ra.*,
        er.full_name as report_name,
        er.description as report_description,
        er.assistance_type as report_type,
        er.latitude as report_lat,
        er.longitude as report_lng,
        er.photo_url as report_photo,
        er.phone as report_phone,
        er.address as report_address,
        ro.name as operation_name,
        ro.disaster_type as operation_disaster_type,
        ro.posko_name,
        ro.posko_address,
        ro.posko_lat,
        ro.posko_lng,
        assigner.full_name as assigner_name,
        assignee.full_name as assignee_name
      FROM report_assignments ra
      JOIN emergency_reports er ON er.id = ra.report_id
      JOIN response_operations ro ON ro.id = ra.response_operation_id
      JOIN profiles assigner ON assigner.user_id = ra.assigned_by
      JOIN profiles assignee ON assignee.user_id = ra.assigned_to
      WHERE ra.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check access
    const assignment = result.rows[0];
    if (assignment.assigned_to !== user.id && user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: assignment });
  } catch (error: any) {
    console.error('GET /api/assignments/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/assignments/[id] - Update assignment status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current assignment
    const currentResult = await query(
      'SELECT * FROM report_assignments WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const assignment = currentResult.rows[0];

    // Check access - only assignee or admin can update
    if (assignment.assigned_to !== user.id && user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: UpdateAssignmentRequest = await request.json();

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);

      // Set timestamps based on status
      if (body.status === 'accepted') {
        updates.push(`accepted_at = NOW()`);
      } else if (body.status === 'in_progress') {
        updates.push(`started_at = NOW()`);
      } else if (body.status === 'completed') {
        updates.push(`completed_at = NOW()`);
      }
    }

    if (body.response_notes !== undefined) {
      updates.push(`response_notes = $${paramIndex++}`);
      values.push(body.response_notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const result = await query(
      `UPDATE report_assignments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Update report dispatch status
    if (body.status) {
      let reportStatus = 'assigned';
      if (body.status === 'in_progress') reportStatus = 'in_progress';
      if (body.status === 'completed') reportStatus = 'resolved';

      await query(
        `UPDATE emergency_reports SET dispatch_status = $1 WHERE id = $2`,
        [reportStatus, assignment.report_id]
      );

      if (body.status === 'completed') {
        await query(
          `UPDATE emergency_reports SET resolved_at = NOW() WHERE id = $1`,
          [assignment.report_id]
        );
      }
    }

    // Notify admin about status changes
    if (body.status && ['accepted', 'completed'].includes(body.status)) {
      const notifType = body.status === 'accepted' ? 'assignment_accepted' : 'assignment_completed';
      const notifTitle = body.status === 'accepted' ? 'Tugas Diterima' : 'Tugas Selesai';

      await query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, $2, $3, $4, 'report_assignment', $5)`,
        [
          assignment.assigned_by,
          notifType,
          notifTitle,
          `Responder telah ${body.status === 'accepted' ? 'menerima' : 'menyelesaikan'} tugas`,
          id
        ]
      );
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/assignments/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
