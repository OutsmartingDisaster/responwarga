import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/mohonijin/vectors - List derived vector layers
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const layerType = searchParams.get('layerType');
    const orthophotoId = searchParams.get('orthophotoId');
    const status = searchParams.get('status') || 'active';

    let sql = `
      SELECT 
        dv.*,
        o.name as orthophoto_name,
        org.name as organization_name,
        p.full_name as created_by_name
      FROM derived_vectors dv
      LEFT JOIN orthophotos o ON o.id = dv.orthophoto_id
      LEFT JOIN organizations org ON org.id = dv.organization_id
      LEFT JOIN profiles p ON p.user_id = dv.created_by
      WHERE dv.status = $1
    `;
    const params: any[] = [status];
    let paramIndex = 2;

    if (layerType) {
      sql += ` AND dv.layer_type = $${paramIndex++}`;
      params.push(layerType);
    }
    if (orthophotoId) {
      sql += ` AND dv.orthophoto_id = $${paramIndex++}`;
      params.push(orthophotoId);
    }

    sql += ' ORDER BY dv.created_at DESC';

    const { rows } = await query(sql, params);

    // Don't return full GeoJSON in list view
    const simplified = rows.map(row => ({
      ...row,
      geojson: undefined,
      has_geojson: !!row.geojson,
    }));

    return NextResponse.json({ data: simplified });
  } catch (error: any) {
    console.error('GET /api/mohonijin/vectors error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/mohonijin/vectors - Create derived vector layer
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, layer_type, description, geojson, orthophoto_id, organization_id, source } = body;

    if (!name || !layer_type || !geojson) {
      return NextResponse.json({ error: 'name, layer_type, and geojson are required' }, { status: 400 });
    }

    const validTypes = ['flood_extent', 'damage_footprint', 'road_blockage', 'shelter_area', 'custom'];
    if (!validTypes.includes(layer_type)) {
      return NextResponse.json({ error: `Invalid layer_type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Parse GeoJSON and extract bounds
    let parsedGeoJSON;
    try {
      parsedGeoJSON = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid GeoJSON' }, { status: 400 });
    }

    const featureCount = parsedGeoJSON.features?.length || 0;

    // Calculate bounds from features
    let bounds = { west: 180, east: -180, south: 90, north: -90 };
    if (parsedGeoJSON.features) {
      for (const feature of parsedGeoJSON.features) {
        const coords = feature.geometry?.coordinates;
        if (coords) {
          extractBounds(coords, bounds);
        }
      }
    }

    const result = await query(
      `INSERT INTO derived_vectors (
        name, layer_type, description, geojson, feature_count,
        bounds_west, bounds_east, bounds_south, bounds_north,
        orthophoto_id, organization_id, source, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, name, layer_type, feature_count, created_at`,
      [
        name, layer_type, description || null, JSON.stringify(parsedGeoJSON), featureCount,
        bounds.west !== 180 ? bounds.west : null,
        bounds.east !== -180 ? bounds.east : null,
        bounds.south !== 90 ? bounds.south : null,
        bounds.north !== -90 ? bounds.north : null,
        orthophoto_id || null, organization_id || null, source || 'manual', user.id
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/mohonijin/vectors error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Helper to extract bounds from GeoJSON coordinates
function extractBounds(coords: any, bounds: { west: number; east: number; south: number; north: number }) {
  if (typeof coords[0] === 'number') {
    // Point: [lng, lat]
    bounds.west = Math.min(bounds.west, coords[0]);
    bounds.east = Math.max(bounds.east, coords[0]);
    bounds.south = Math.min(bounds.south, coords[1]);
    bounds.north = Math.max(bounds.north, coords[1]);
  } else {
    // Array of coordinates
    for (const c of coords) {
      extractBounds(c, bounds);
    }
  }
}
