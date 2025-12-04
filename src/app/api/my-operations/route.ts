import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET /api/my-operations - List operations where current user is a team member
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT 
        rtm.id,
        rtm.status,
        rtm.role,
        rtm.invited_at,
        json_build_object(
          'id', ro.id,
          'name', ro.name,
          'disaster_type', ro.disaster_type,
          'disaster_location_name', ro.disaster_location_name,
          'disaster_lat', ro.disaster_lat,
          'disaster_lng', ro.disaster_lng,
          'disaster_radius_km', ro.disaster_radius_km,
          'status', ro.status,
          'started_at', ro.started_at,
          'organization_id', ro.organization_id
        ) as operation
       FROM response_team_members rtm
       JOIN response_operations ro ON ro.id = rtm.response_operation_id
       WHERE rtm.user_id = $1 AND ro.status != 'completed'
       ORDER BY rtm.invited_at DESC`,
      [user.id]
    );

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/my-operations error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
