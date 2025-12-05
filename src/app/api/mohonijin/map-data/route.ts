import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent reports with location
    const reportsResult = await query(`
      SELECT id, description as name, latitude, longitude, status, 'report' as type
      FROM emergency_reports
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY created_at DESC LIMIT 100
    `);

    // Get active operations
    const opsResult = await query(`
      SELECT id, name, disaster_lat as latitude, disaster_lng as longitude, status, 'operation' as type
      FROM response_operations
      WHERE status = 'active' AND disaster_lat IS NOT NULL AND disaster_lng IS NOT NULL
    `);

    // Get online responders
    const respondersResult = await query(`
      SELECT id, full_name as name, latitude, longitude, status, 'responder' as type
      FROM profiles
      WHERE role = 'org_responder' AND (status = 'on_duty' OR status = 'active')
        AND latitude IS NOT NULL AND longitude IS NOT NULL
    `);

    const markers = [
      ...reportsResult.rows,
      ...opsResult.rows,
      ...respondersResult.rows
    ];

    return NextResponse.json({
      markers,
      stats: {
        reports: reportsResult.rows.length,
        operations: opsResult.rows.length,
        responders: respondersResult.rows.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
