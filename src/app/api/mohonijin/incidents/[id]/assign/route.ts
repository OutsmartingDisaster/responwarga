import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/mohonijin/incidents/[id]/assign - Create assignment for incident
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { responder_id, priority, notes } = body;

    if (!responder_id) {
      return NextResponse.json({ error: 'responder_id is required' }, { status: 400 });
    }

    // Get incident to determine source type
    const incidentResult = await query(
      `SELECT * FROM incident_events WHERE id = $1`,
      [id]
    );

    if (incidentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const incident = incidentResult.rows[0];

    // Get responder's organization
    const responderResult = await query(
      `SELECT organization_id FROM profiles WHERE user_id = $1`,
      [responder_id]
    );

    if (responderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Responder not found' }, { status: 404 });
    }

    const organizationId = responderResult.rows[0].organization_id;

    // Check for existing assignment
    const existingResult = await query(
      `SELECT id FROM assignments 
       WHERE (emergency_report_id = $1 OR contribution_id = $1) 
       AND responder_id = $2 
       AND status NOT IN ('completed', 'declined', 'cancelled')`,
      [id, responder_id]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'Responder already assigned to this incident' }, { status: 400 });
    }

    // Create assignment based on source type
    const assignmentData: any = {
      organization_id: organizationId,
      responder_id,
      assigned_by: user.id,
      status: 'assigned',
      priority: priority || 'normal',
      notes: notes || null,
    };

    if (incident.source_type === 'emergency_report') {
      assignmentData.emergency_report_id = id;
    } else {
      assignmentData.contribution_id = id;
    }

    const insertResult = await query(
      `INSERT INTO assignments (
        organization_id, responder_id, assigned_by, status, priority, notes,
        emergency_report_id, contribution_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        assignmentData.organization_id,
        assignmentData.responder_id,
        assignmentData.assigned_by,
        assignmentData.status,
        assignmentData.priority,
        assignmentData.notes,
        assignmentData.emergency_report_id || null,
        assignmentData.contribution_id || null,
      ]
    );

    // Update incident dispatch status
    if (incident.source_type === 'emergency_report') {
      await query(
        `UPDATE emergency_reports SET dispatch_status = 'assigned' WHERE id = $1`,
        [id]
      );
    }

    // Create notification for responder
    await query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, 'new_assignment', $2, $3, 'assignment', $4)`,
      [
        responder_id,
        'Tugas Baru',
        'Anda mendapat tugas baru untuk merespon laporan warga',
        insertResult.rows[0].id
      ]
    );

    return NextResponse.json({ data: insertResult.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/mohonijin/incidents/[id]/assign error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
