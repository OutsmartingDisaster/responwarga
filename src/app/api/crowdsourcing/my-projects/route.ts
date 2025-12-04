import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET - List projects where user is a moderator
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows } = await query(
      `SELECT p.*, m.can_approve, m.can_reject, m.can_flag, m.can_export,
              (SELECT COUNT(*) FROM crowdsource_submissions s WHERE s.project_id = p.id AND s.status = 'pending') as pending_count
       FROM crowdsource_projects p
       JOIN crowdsource_moderators m ON m.project_id = p.id
       WHERE m.user_id = $1 AND m.status = 'active'
       ORDER BY p.created_at DESC`,
      [user.id]
    );

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('[crowdsourcing/my-projects] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
