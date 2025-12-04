import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import type { CrowdsourceProject } from '@/lib/crowdsourcing/types';

// GET - List projects (public for active, admin for all)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');

    let sql: string;
    let params: any[];

    if (status === 'all') {
      // Return all projects (for admin)
      sql = `SELECT * FROM crowdsource_projects ORDER BY created_at DESC LIMIT $1`;
      params = [limit];
    } else {
      sql = `SELECT * FROM crowdsource_projects WHERE status = $1 ORDER BY created_at DESC LIMIT $2`;
      params = [status, limit];
    }

    const { rows } = await query<CrowdsourceProject>(sql, params);
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('[crowdsourcing/projects] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create project (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title, description, disaster_type, status = 'draft',
      location_name, latitude, longitude, geofence_radius_km = 5,
      geofence_polygon, allow_photo = true, allow_video = true,
      max_file_size_mb = 10, require_location = true, auto_approve = false,
      start_date, end_date
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { rows } = await query<CrowdsourceProject>(
      `INSERT INTO crowdsource_projects (
        title, description, disaster_type, status,
        location_name, latitude, longitude, geofence_radius_km,
        geofence_polygon, allow_photo, allow_video,
        max_file_size_mb, require_location, auto_approve,
        start_date, end_date, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        title, description, disaster_type, status,
        location_name, latitude, longitude, geofence_radius_km,
        geofence_polygon ? JSON.stringify(geofence_polygon) : null,
        allow_photo, allow_video, max_file_size_mb, require_location,
        auto_approve, start_date, end_date, user.id
      ]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[crowdsourcing/projects] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
