import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/mohonijin/operations - List all response operations (super admin)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organizationId');

    let sql = `
      SELECT 
        ro.*,
        o.name as organization_name,
        o.slug as organization_slug,
        p.full_name as created_by_name,
        (SELECT COUNT(*) FROM response_team_members rtm WHERE rtm.response_operation_id = ro.id) as team_count,
        (SELECT COUNT(*) FROM response_team_members rtm WHERE rtm.response_operation_id = ro.id AND rtm.status = 'accepted') as active_team_count,
        (SELECT COUNT(*) FROM report_assignments ra WHERE ra.response_operation_id = ro.id) as total_assignments,
        (SELECT COUNT(*) FROM report_assignments ra WHERE ra.response_operation_id = ro.id AND ra.status = 'completed') as completed_assignments
      FROM response_operations ro
      JOIN organizations o ON o.id = ro.organization_id
      LEFT JOIN profiles p ON p.user_id = ro.created_by
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND ro.status = $${paramIndex++}`;
      params.push(status);
    }
    if (organizationId) {
      sql += ` AND ro.organization_id = $${paramIndex++}`;
      params.push(organizationId);
    }

    sql += ' ORDER BY ro.created_at DESC';

    const { rows } = await query(sql, params);

    // Get summary stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
        COUNT(DISTINCT organization_id) as organizations_involved
      FROM response_operations
    `);

    return NextResponse.json({
      data: rows,
      stats: statsResult.rows[0]
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/operations error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
