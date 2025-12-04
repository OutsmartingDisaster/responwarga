import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { isWithinGeofence } from '@/lib/crowdsourcing/geofence';

export async function POST(request: NextRequest) {
  try {
    const { project_id, latitude, longitude } = await request.json();

    if (!project_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get project
    const { rows } = await query(
      'SELECT latitude, longitude, geofence_radius_km, geofence_polygon FROM crowdsource_projects WHERE id = $1',
      [project_id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = rows[0];
    const result = isWithinGeofence(latitude, longitude, project);

    return NextResponse.json({
      valid: result.valid,
      message: result.message,
      project_center: project.latitude && project.longitude ? {
        lat: project.latitude,
        lng: project.longitude
      } : null,
      radius_km: project.geofence_radius_km
    });
  } catch (error: any) {
    console.error('[crowdsourcing/validate-location] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
