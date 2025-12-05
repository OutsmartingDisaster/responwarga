import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET /api/my-assignments - List assignments for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operation_id');
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        ra.*,
        er.description as report_description,
        er.disaster_type as report_category,
        er.latitude as report_lat,
        er.longitude as report_lng,
        er.photo_url as report_photo,
        er.location as report_location,
        er.address as report_address,
        er.full_name as reporter_name,
        er.phone_number as reporter_phone,
        er.assistance_type,
        ro.name as operation_name,
        ro.disaster_type,
        ro.disaster_location_name as operation_location,
        assigner.full_name as assigner_name
      FROM report_assignments ra
      LEFT JOIN emergency_reports er ON er.id = ra.report_id
      LEFT JOIN response_operations ro ON ro.id = ra.response_operation_id
      LEFT JOIN profiles assigner ON assigner.user_id = ra.assigned_by
      WHERE ra.assigned_to = $1
    `;
    const params: any[] = [user.id];
    let paramIndex = 2;

    if (operationId) {
      sql += ` AND ra.response_operation_id = $${paramIndex++}`;
      params.push(operationId);
    }

    if (status) {
      sql += ` AND ra.status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ' ORDER BY ra.assigned_at DESC';

    const result = await query(sql, params);

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/my-assignments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
