import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET /api/assignments - List my assignments (for responders)
export async function GET(request: NextRequest) {
  try {
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
        er.phone as report_phone,
        ro.name as operation_name,
        ro.disaster_type as operation_disaster_type,
        assigner.full_name as assigner_name
      FROM report_assignments ra
      JOIN emergency_reports er ON er.id = ra.report_id
      JOIN response_operations ro ON ro.id = ra.response_operation_id
      JOIN profiles assigner ON assigner.user_id = ra.assigned_by
      WHERE ra.assigned_to = $1
    `;
    const params: any[] = [user.id];
    let paramIndex = 2;

    if (status) {
      sql += ` AND ra.status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ' ORDER BY ra.assigned_at DESC';

    const result = await query(sql, params);

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/assignments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
