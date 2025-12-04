import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import type { CrowdsourceProject } from '@/lib/crowdsourcing/types';

// GET - Project detail (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { rows } = await query<CrowdsourceProject>(
      'SELECT * FROM crowdsource_projects WHERE id = $1',
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error: any) {
    console.error('[crowdsourcing/projects/id] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update project (super_admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowedFields = [
      'title', 'description', 'disaster_type', 'status',
      'location_name', 'latitude', 'longitude', 'geofence_radius_km',
      'geofence_polygon', 'allow_photo', 'allow_video',
      'max_file_size_mb', 'require_location', 'auto_approve',
      'start_date', 'end_date'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const value = field === 'geofence_polygon' && body[field]
          ? JSON.stringify(body[field])
          : body[field];
        fields.push(`${field} = $${idx++}`);
        values.push(value);
      }
    }

    if (!fields.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const { rows } = await query<CrowdsourceProject>(
      `UPDATE crowdsource_projects SET ${fields.join(', ')}, updated_at = NOW() 
       WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error: any) {
    console.error('[crowdsourcing/projects/id] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete project (super_admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { rowCount } = await query(
      'DELETE FROM crowdsource_projects WHERE id = $1',
      [id]
    );

    if (!rowCount) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[crowdsourcing/projects/id] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
