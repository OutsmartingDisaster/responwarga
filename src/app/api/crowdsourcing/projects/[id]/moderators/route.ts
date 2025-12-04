import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET - List moderators for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: projectId } = await params;

    // Get active moderators
    const { rows: moderators } = await query(
      `SELECT m.*, u.email, p.name as user_name
       FROM crowdsource_moderators m
       JOIN auth.users u ON u.id = m.user_id
       LEFT JOIN profiles p ON p.user_id = m.user_id
       WHERE m.project_id = $1
       ORDER BY m.invited_at DESC`,
      [projectId]
    );

    // Get pending invites
    const { rows: invites } = await query(
      `SELECT * FROM crowdsource_moderator_invites
       WHERE project_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
       ORDER BY invited_at DESC`,
      [projectId]
    );

    return NextResponse.json({ data: { moderators, invites } });
  } catch (error: any) {
    console.error('[crowdsourcing/moderators] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
