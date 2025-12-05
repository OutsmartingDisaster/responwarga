import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/mohonijin/audit-log - List audit log entries
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    let sql = `
      SELECT 
        al.*,
        p.full_name as user_name
      FROM admin_audit_log al
      LEFT JOIN profiles p ON p.user_id = al.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (action) {
      sql += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }
    if (entityType) {
      sql += ` AND al.entity_type = $${paramIndex++}`;
      params.push(entityType);
    }
    if (userId) {
      sql += ` AND al.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    sql += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const { rows } = await query(sql, params);

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('GET /api/mohonijin/audit-log error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/mohonijin/audit-log - Create audit log entry (internal use)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, entity_type, entity_id, details } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const result = await query(
      `INSERT INTO admin_audit_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user.id, action, entity_type || null, entity_id || null, details ? JSON.stringify(details) : null, ip, userAgent]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/mohonijin/audit-log error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
