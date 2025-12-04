import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import { UpdateOperationRequest } from '@/types/operations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/operations/[id] - Get operation detail
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get operation with related data
    const result = await query(
      `SELECT 
        ro.*,
        o.name as organization_name,
        o.slug as organization_slug,
        u.full_name as created_by_name
      FROM response_operations ro
      JOIN organizations o ON o.id = ro.organization_id
      LEFT JOIN profiles u ON u.user_id = ro.created_by
      WHERE ro.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    const operation = result.rows[0];

    // Check access (org members or admin)
    if (user.role !== 'admin') {
      const profileResult = await query(
        'SELECT organization_id FROM profiles WHERE user_id = $1',
        [user.id]
      );
      
      if (profileResult.rows.length === 0 || profileResult.rows[0].organization_id !== operation.organization_id) {
        // Check if user is a team member
        const memberResult = await query(
          'SELECT id FROM response_team_members WHERE response_operation_id = $1 AND user_id = $2 AND status = $3',
          [id, user.id, 'accepted']
        );
        
        if (memberResult.rows.length === 0) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    // Get team members
    const membersResult = await query(
      `SELECT 
        rtm.*,
        p.full_name as user_name,
        p.phone as user_phone,
        inv.full_name as invited_by_name
      FROM response_team_members rtm
      JOIN profiles p ON p.user_id = rtm.user_id
      LEFT JOIN profiles inv ON inv.user_id = rtm.invited_by
      WHERE rtm.response_operation_id = $1
      ORDER BY rtm.invited_at DESC`,
      [id]
    );

    // Get field reports count
    const reportsCountResult = await query(
      'SELECT COUNT(*) as count FROM field_reports WHERE response_operation_id = $1',
      [id]
    );

    // Get assignments count
    const assignmentsCountResult = await query(
      'SELECT COUNT(*) as count FROM report_assignments WHERE response_operation_id = $1',
      [id]
    );

    return NextResponse.json({
      data: {
        ...operation,
        team_members: membersResult.rows,
        field_reports_count: parseInt(reportsCountResult.rows[0].count),
        assignments_count: parseInt(assignmentsCountResult.rows[0].count)
      }
    });
  } catch (error: any) {
    console.error('GET /api/operations/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/operations/[id] - Update operation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only org_admin can update operations
    if (user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: UpdateOperationRequest = await request.json();

    // Check ownership
    const opResult = await query(
      'SELECT organization_id FROM response_operations WHERE id = $1',
      [id]
    );

    if (opResult.rows.length === 0) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    if (user.role !== 'admin') {
      const profileResult = await query(
        'SELECT organization_id FROM profiles WHERE user_id = $1',
        [user.id]
      );
      
      if (profileResult.rows[0].organization_id !== opResult.rows[0].organization_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.disaster_radius_km !== undefined) {
      updates.push(`disaster_radius_km = $${paramIndex++}`);
      values.push(body.disaster_radius_km);
    }
    if (body.posko_name !== undefined) {
      updates.push(`posko_name = $${paramIndex++}`);
      values.push(body.posko_name);
    }
    if (body.posko_address !== undefined) {
      updates.push(`posko_address = $${paramIndex++}`);
      values.push(body.posko_address);
    }
    if (body.posko_lat !== undefined) {
      updates.push(`posko_lat = $${paramIndex++}`);
      values.push(body.posko_lat);
    }
    if (body.posko_lng !== undefined) {
      updates.push(`posko_lng = $${paramIndex++}`);
      values.push(body.posko_lng);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);
      
      // Set ended_at if completing
      if (body.status === 'completed') {
        updates.push(`ended_at = NOW()`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const result = await query(
      `UPDATE response_operations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/operations/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/operations/[id] - Delete operation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete operations
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await query('DELETE FROM response_operations WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/operations/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
