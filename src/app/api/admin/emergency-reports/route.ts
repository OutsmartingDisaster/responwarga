import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET /api/admin/emergency-reports - List emergency reports for org_admin
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only org_admin and admin can access
    if (user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dispatchStatus = searchParams.get('dispatch_status');
    const status = searchParams.get('status');

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const orgId = profileResult.rows[0].organization_id;

    // Build query - get reports assigned to this organization or unassigned in their area
    let sql = `
      SELECT 
        er.*,
        p.full_name as reporter_name
      FROM emergency_reports er
      LEFT JOIN profiles p ON p.user_id = er.reporter_id
      WHERE (er.assigned_organization_id = $1 OR er.assigned_organization_id IS NULL)
    `;
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (dispatchStatus) {
      sql += ` AND er.dispatch_status = $${paramIndex}`;
      params.push(dispatchStatus);
      paramIndex++;
    }

    if (status) {
      sql += ` AND er.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ' ORDER BY er.created_at DESC LIMIT 100';

    const result = await query(sql, params);

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/admin/emergency-reports error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/emergency-reports - Update report status
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, dispatch_status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (dispatch_status) {
      updates.push(`dispatch_status = $${paramIndex}`);
      params.push(dispatch_status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push(`status_updated_by = $${paramIndex}`);
    params.push(user.id);
    paramIndex++;

    updates.push(`status_updated_at = NOW()`);

    params.push(id);

    const result = await query(
      `UPDATE emergency_reports SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/admin/emergency-reports error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
