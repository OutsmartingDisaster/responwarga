import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import { CreateFieldReportRequest } from '@/types/operations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/operations/[id]/field-reports - List field reports
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let sql = `
      SELECT 
        fr.*,
        p.full_name as reporter_name
      FROM field_reports fr
      JOIN profiles p ON p.user_id = fr.reported_by
      WHERE fr.response_operation_id = $1
    `;
    const params_arr: any[] = [id];
    let paramIndex = 2;

    if (category) {
      sql += ` AND fr.category = $${paramIndex++}`;
      params_arr.push(category);
    }

    sql += ' ORDER BY fr.created_at DESC';

    const result = await query(sql, params_arr);

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/operations/[id]/field-reports error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/operations/[id]/field-reports - Create field report
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a team member of this operation
    const memberResult = await query(
      'SELECT id FROM response_team_members WHERE response_operation_id = $1 AND user_id = $2 AND status = $3',
      [id, user.id, 'accepted']
    );

    if (memberResult.rows.length === 0 && user.role !== 'admin') {
      return NextResponse.json({ error: 'You are not a member of this operation' }, { status: 403 });
    }

    const body: CreateFieldReportRequest = await request.json();

    // Validate required fields
    if (!body.category || !body.title) {
      return NextResponse.json({ error: 'category and title are required' }, { status: 400 });
    }

    // Insert field report
    const result = await query(
      `INSERT INTO field_reports (
        response_operation_id, reported_by, category, subcategory,
        title, description, location_name, latitude, longitude,
        severity, urgency, affected_count, quantity_delivered, photos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id,
        user.id,
        body.category,
        body.subcategory || null,
        body.title,
        body.description || null,
        body.location_name || null,
        body.latitude || null,
        body.longitude || null,
        body.severity || null,
        body.urgency || null,
        body.affected_count || null,
        body.quantity_delivered || null,
        body.photos || []
      ]
    );

    // Notify org_admin about new field report
    const opResult = await query(
      `SELECT ro.name, ro.organization_id, p.user_id as admin_user_id
       FROM response_operations ro
       JOIN profiles p ON p.organization_id = ro.organization_id AND p.role = 'org_admin'
       WHERE ro.id = $1`,
      [id]
    );

    if (opResult.rows.length > 0) {
      for (const admin of opResult.rows) {
        if (admin.admin_user_id !== user.id) {
          await query(
            `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
             VALUES ($1, 'new_field_report', $2, $3, 'field_report', $4)`,
            [
              admin.admin_user_id,
              'Laporan Lapangan Baru',
              `Laporan baru: ${body.title}`,
              result.rows[0].id
            ]
          );
        }
      }
    }

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/operations/[id]/field-reports error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
