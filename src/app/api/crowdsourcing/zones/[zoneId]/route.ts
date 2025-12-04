import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// PUT - Update a zone
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { zoneId } = await params;
    const body = await request.json();

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowedFields = ['zone_name', 'zone_level', 'latitude', 'longitude', 'radius_km', 'admin_area_code', 'display_order', 'is_active'];
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(body[key]);
      }
    }

    if (!updates.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(zoneId);
    const { rows } = await query(
      `UPDATE crowdsource_geofence_zones SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    return NextResponse.json({ data: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a zone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { zoneId } = await params;
    
    // Get project_id before delete
    const { rows: zones } = await query('SELECT project_id FROM crowdsource_geofence_zones WHERE id = $1', [zoneId]);
    
    await query('DELETE FROM crowdsource_geofence_zones WHERE id = $1', [zoneId]);

    // Check if any zones left, if not disable multi-zone
    if (zones.length) {
      const { rows: remaining } = await query(
        'SELECT COUNT(*) as count FROM crowdsource_geofence_zones WHERE project_id = $1',
        [zones[0].project_id]
      );
      if (parseInt(remaining[0].count) === 0) {
        await query('UPDATE crowdsource_projects SET use_multi_zone = false WHERE id = $1', [zones[0].project_id]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
