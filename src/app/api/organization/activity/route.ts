import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies(request.cookies);
  if (!session || session.role !== 'org_admin' || !session.profile?.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { rows } = await query(
      `SELECT 
        tal.id,
        tal.action,
        tal.details,
        tal.created_at,
        p.name as user_name,
        p.email as user_email
       FROM team_activity_logs tal
       LEFT JOIN profiles p ON tal.user_id = p.id
       WHERE tal.organization_id = $1
       ORDER BY tal.created_at DESC
       LIMIT $2`,
      [session.profile.organization_id, limit]
    );

    return NextResponse.json({ data: rows });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}
