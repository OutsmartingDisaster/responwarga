import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/org/incidents - List incidents for user's organization
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0 || !profileResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const organizationId = profileResult.rows[0].organization_id;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sourceType = searchParams.get('sourceType');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

    let sql = `SELECT * FROM incident_events WHERE organization_id = $1`;
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND incident_status = $${paramIndex++}`;
      params.push(status);
    }
    if (sourceType) {
      sql += ` AND source_type = $${paramIndex++}`;
      params.push(sourceType);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const { rows } = await query(sql, params);

    // Convert lat/lng to numbers
    const incidents = rows.map(row => ({
      ...row,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
    }));

    return NextResponse.json({ data: incidents });
  } catch (error: any) {
    console.error('GET /api/org/incidents error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
