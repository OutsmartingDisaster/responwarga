import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: operationId } = await params;
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '10');

    // Verify user has access to this operation
    const opResult = await query(
      `SELECT ro.*, p.organization_id 
       FROM response_operations ro
       JOIN profiles p ON p.user_id = $1
       WHERE ro.id = $2 AND ro.organization_id = p.organization_id`,
      [user.id, operationId]
    );

    if (opResult.rows.length === 0) {
      return NextResponse.json({ error: 'Operation not found or access denied' }, { status: 404 });
    }

    // Fetch emergency reports within radius using Haversine formula
    const emergencyReports = await query(
      `SELECT 
        er.id, 
        'emergency_report' as type,
        er.description as title,
        er.description,
        er.category,
        er.latitude,
        er.longitude,
        er.status,
        er.created_at,
        er.reporter_name,
        er.reporter_phone,
        (6371 * acos(cos(radians($1)) * cos(radians(er.latitude)) * cos(radians(er.longitude) - radians($2)) + sin(radians($1)) * sin(radians(er.latitude)))) as distance_km,
        ra.status as assignment_status
       FROM emergency_reports er
       LEFT JOIN report_assignments ra ON ra.report_id = er.id AND ra.report_type = 'emergency_report' AND ra.response_operation_id = $4
       WHERE er.latitude IS NOT NULL 
         AND er.longitude IS NOT NULL
         AND (6371 * acos(cos(radians($1)) * cos(radians(er.latitude)) * cos(radians(er.longitude) - radians($2)) + sin(radians($1)) * sin(radians(er.latitude)))) <= $3
       ORDER BY distance_km ASC`,
      [lat, lng, radius, operationId]
    );

    // Fetch community contributions within radius
    const contributions = await query(
      `SELECT 
        cc.id, 
        'community_contribution' as type,
        cc.title,
        cc.description,
        cc.category,
        cc.latitude,
        cc.longitude,
        cc.status,
        cc.created_at,
        NULL as reporter_name,
        NULL as reporter_phone,
        (6371 * acos(cos(radians($1)) * cos(radians(cc.latitude)) * cos(radians(cc.longitude) - radians($2)) + sin(radians($1)) * sin(radians(cc.latitude)))) as distance_km,
        ra.status as assignment_status
       FROM community_contributions cc
       LEFT JOIN report_assignments ra ON ra.report_id = cc.id AND ra.report_type = 'community_contribution' AND ra.response_operation_id = $4
       WHERE cc.latitude IS NOT NULL 
         AND cc.longitude IS NOT NULL
         AND (6371 * acos(cos(radians($1)) * cos(radians(cc.latitude)) * cos(radians(cc.longitude) - radians($2)) + sin(radians($1)) * sin(radians(cc.latitude)))) <= $3
       ORDER BY distance_km ASC`,
      [lat, lng, radius, operationId]
    );

    // Combine and sort by distance
    const allReports = [...emergencyReports.rows, ...contributions.rows]
      .sort((a, b) => a.distance_km - b.distance_km);

    return NextResponse.json({ data: allReports });
  } catch (error: any) {
    console.error('Error fetching nearby reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
