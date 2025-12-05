import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let sql = `
      SELECT er.*, o.name as organization_name
      FROM emergency_reports er
      LEFT JOIN organizations o ON o.id = er.organization_id
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      sql += ` WHERE er.status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ` ORDER BY er.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);
    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
