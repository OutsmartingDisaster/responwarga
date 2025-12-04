import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET - List map layers for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { rows } = await query(
      `SELECT * FROM crowdsource_map_layers 
       WHERE project_id = $1 AND is_visible = true
       ORDER BY z_index ASC`,
      [projectId]
    );
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add new map layer (admin only)
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
      `INSERT INTO crowdsource_map_layers 
       (project_id, layer_name, layer_type, description, source_url, source_type,
        bounds_north, bounds_south, bounds_east, bounds_west,
        opacity, z_index, is_visible, is_default_on, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        projectId, body.layer_name, body.layer_type, body.description,
        body.source_url, body.source_type || 'url',
        body.bounds_north, body.bounds_south, body.bounds_east, body.bounds_west,
        body.opacity || 0.7, body.z_index || 1, body.is_visible ?? true, 
        body.is_default_on ?? false, user.id
      ]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
