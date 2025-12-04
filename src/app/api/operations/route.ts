import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import { CreateOperationRequest, ResponseOperation } from '@/types/operations';

// GET /api/operations - List operations for current user's organization
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organization_id');

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userOrgId = profileResult.rows[0].organization_id;
    
    // Build query based on role
    let sql = `
      SELECT 
        ro.*,
        o.name as organization_name,
        o.slug as organization_slug,
        (SELECT COUNT(*) FROM response_team_members rtm WHERE rtm.response_operation_id = ro.id AND rtm.status = 'accepted') as team_count,
        (SELECT COUNT(*) FROM field_reports fr WHERE fr.response_operation_id = ro.id) as field_reports_count,
        (SELECT COUNT(*) FROM report_assignments ra WHERE ra.response_operation_id = ro.id) as assignments_count
      FROM response_operations ro
      JOIN organizations o ON o.id = ro.organization_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by organization (for org_admin, only their org)
    if (user.role === 'org_admin' || user.role === 'org_responder') {
      sql += ` AND ro.organization_id = $${paramIndex}`;
      params.push(userOrgId);
      paramIndex++;
    } else if (organizationId) {
      sql += ` AND ro.organization_id = $${paramIndex}`;
      params.push(organizationId);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      sql += ` AND ro.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ' ORDER BY ro.created_at DESC';

    const result = await query(sql, params);

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/operations error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/operations - Create new operation
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only org_admin can create operations
    if (user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateOperationRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.disaster_type || !body.disaster_location_name || 
        body.disaster_lat === undefined || body.disaster_lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const organizationId = profileResult.rows[0].organization_id;

    // Insert operation
    const result = await query(
      `INSERT INTO response_operations (
        organization_id, name, disaster_type, description,
        disaster_location_name, disaster_lat, disaster_lng, disaster_radius_km,
        posko_name, posko_address, posko_lat, posko_lng,
        created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active')
      RETURNING *`,
      [
        organizationId,
        body.name,
        body.disaster_type,
        body.description || null,
        body.disaster_location_name,
        body.disaster_lat,
        body.disaster_lng,
        body.disaster_radius_km || 10,
        body.posko_name || null,
        body.posko_address || null,
        body.posko_lat || null,
        body.posko_lng || null,
        user.id
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/operations error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
