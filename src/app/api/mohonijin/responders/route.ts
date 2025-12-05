import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/mohonijin/responders - List available responders
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status'); // active, on_duty, etc.

    let sql = `
      SELECT 
        p.user_id,
        p.full_name,
        p.phone,
        p.role,
        p.status,
        p.organization_id,
        o.name as organization_name,
        (SELECT COUNT(*) FROM assignments a WHERE a.responder_id = p.user_id AND a.status IN ('assigned', 'in_progress')) as active_assignments
      FROM profiles p
      LEFT JOIN organizations o ON o.id = p.organization_id
      WHERE p.role IN ('responder', 'org_responder')
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      sql += ` AND p.organization_id = $${paramIndex++}`;
      params.push(organizationId);
    }

    if (status) {
      sql += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ' ORDER BY o.name, p.full_name';

    const result = await query(sql, params);

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/mohonijin/responders error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
