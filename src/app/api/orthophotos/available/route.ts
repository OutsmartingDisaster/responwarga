import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/orthophotos/available - Get available orthophotos for a location
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const disasterType = searchParams.get('disasterType');

    // Find orthophotos that cover the given location or are nearby
    let sql = `
      SELECT id, name, disaster_type, capture_date, thumbnail_path,
             bounds_west, bounds_east, bounds_south, bounds_north,
             center_lat, center_lng, visibility
      FROM orthophotos
      WHERE status = 'ready'
        AND (visibility = 'public' OR visibility = 'organization')
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // If coordinates provided, filter by bounds
    if (lat && lng) {
      sql += ` AND (
        (bounds_west IS NOT NULL AND bounds_east IS NOT NULL 
         AND bounds_south IS NOT NULL AND bounds_north IS NOT NULL
         AND $${paramIndex} BETWEEN bounds_west AND bounds_east
         AND $${paramIndex + 1} BETWEEN bounds_south AND bounds_north)
        OR (center_lat IS NOT NULL AND center_lng IS NOT NULL
            AND ST_Distance(
              ST_MakePoint($${paramIndex}, $${paramIndex + 1})::geography,
              ST_MakePoint(center_lng, center_lat)::geography
            ) < 50000)
      )`;
      params.push(lng, lat);
      paramIndex += 2;
    }

    if (disasterType) {
      sql += ` AND disaster_type = $${paramIndex++}`;
      params.push(disasterType);
    }

    sql += ' ORDER BY capture_date DESC NULLS LAST LIMIT 10';

    const { rows } = await query(sql, params);

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    // If PostGIS not available, return empty array
    if (error?.message?.includes('ST_Distance') || error?.message?.includes('ST_MakePoint')) {
      return NextResponse.json({ data: [] });
    }
    console.error('GET /api/orthophotos/available error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
