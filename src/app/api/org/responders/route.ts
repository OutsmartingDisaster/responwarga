import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/org/responders - List responders in user's organization
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id, role FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0 || !profileResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    // Only org_admin can list responders
    const userRole = profileResult.rows[0].role;
    if (userRole !== 'org_admin' && userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = profileResult.rows[0].organization_id;

    const { rows } = await query(`
      SELECT 
        p.user_id,
        p.full_name,
        p.phone,
        p.role,
        p.status,
        (SELECT COUNT(*) FROM assignments a WHERE a.responder_id = p.user_id AND a.status IN ('assigned', 'in_progress')) as active_assignments,
        (SELECT COUNT(*) FROM assignments a WHERE a.responder_id = p.user_id AND a.status = 'completed') as completed_assignments
      FROM profiles p
      WHERE p.organization_id = $1 AND p.role IN ('responder', 'org_responder')
      ORDER BY p.full_name
    `, [orgId]);

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('GET /api/org/responders error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
