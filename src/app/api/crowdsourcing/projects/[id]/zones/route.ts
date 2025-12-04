import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET - List geofence zones for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { rows } = await query(
      `SELECT * FROM crowdsource_geofence_zones 
       WHERE project_id = $1 AND is_active = true
       ORDER BY display_order ASC`,
      [projectId]
    );
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add new geofence zone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    const { rows } = await query(
      `INSERT INTO crowdsource_geofence_zones 
       (project_id, zone_name, zone_level, latitude, longitude, radius_km, admin_area_code, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 
               COALESCE($8, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM crowdsource_geofence_zones WHERE project_id = $1)))
       RETURNING *`,
      [projectId, body.zone_name, body.zone_level || 'radius', 
       body.latitude, body.longitude, body.radius_km || 5, 
       body.admin_area_code, body.display_order]
    );

    // Enable multi-zone on project
    await query('UPDATE crowdsource_projects SET use_multi_zone = true WHERE id = $1', [projectId]);

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove all zones (reset to single location)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    await query('DELETE FROM crowdsource_geofence_zones WHERE project_id = $1', [projectId]);
    await query('UPDATE crowdsource_projects SET use_multi_zone = false WHERE id = $1', [projectId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
