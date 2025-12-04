import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET /api/my-assignments/[id] - Get single assignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT ra.*, er.description as report_description, er.category as report_category,
              er.latitude as report_lat, er.longitude as report_lng, er.photo_url as report_photo,
              ro.name as operation_name, ro.disaster_type
       FROM report_assignments ra
       LEFT JOIN emergency_reports er ON er.id = ra.report_id
       LEFT JOIN response_operations ro ON ro.id = ra.response_operation_id
       WHERE ra.id = $1 AND ra.assigned_to = $2`,
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/my-assignments/[id] - Update assignment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, response_notes } = await request.json();

    // Verify ownership
    const checkResult = await query(
      'SELECT id, status FROM report_assignments WHERE id = $1 AND assigned_to = $2',
      [id, user.id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      
      // Set timestamps based on status
      if (status === 'accepted') {
        updates.push(`accepted_at = NOW()`);
      } else if (status === 'in_progress') {
        updates.push(`started_at = NOW()`);
      } else if (status === 'completed') {
        updates.push(`completed_at = NOW()`);
      }
    }

    if (response_notes !== undefined) {
      updates.push(`response_notes = $${paramIndex++}`);
      values.push(response_notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const result = await query(
      `UPDATE report_assignments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Notify assigner about status change
    if (status) {
      const assignment = result.rows[0];
      await query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'assignment_update', $2, $3, 'report_assignment', $4)`,
        [
          assignment.assigned_by,
          'Status Tugas Diperbarui',
          `Responder telah ${status === 'accepted' ? 'menerima' : status === 'in_progress' ? 'memulai' : status === 'completed' ? 'menyelesaikan' : 'mengupdate'} tugas`,
          id
        ]
      );
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
