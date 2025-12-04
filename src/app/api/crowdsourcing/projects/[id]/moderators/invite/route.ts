import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import crypto from 'crypto';

// POST - Invite a moderator
export async function POST(
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
    const { email, can_approve = true, can_reject = true, can_flag = true, can_export = false } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    // Check if already invited
    const { rows: existing } = await query(
      `SELECT * FROM crowdsource_moderator_invites 
       WHERE project_id = $1 AND email = $2 AND accepted_at IS NULL AND expires_at > NOW()`,
      [projectId, email]
    );
    if (existing.length) {
      return NextResponse.json({ error: 'Email sudah diundang' }, { status: 400 });
    }

    // Check if already a moderator
    const { rows: existingMod } = await query(
      `SELECT m.* FROM crowdsource_moderators m
       JOIN auth.users u ON u.id = m.user_id
       WHERE m.project_id = $1 AND u.email = $2 AND m.status = 'active'`,
      [projectId, email]
    );
    if (existingMod.length) {
      return NextResponse.json({ error: 'Email sudah menjadi moderator' }, { status: 400 });
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    const { rows } = await query(
      `INSERT INTO crowdsource_moderator_invites 
       (project_id, email, can_approve, can_reject, can_flag, can_export, invite_token, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [projectId, email, can_approve, can_reject, can_flag, can_export, inviteToken, user.id]
    );

    // TODO: Send email with invite link
    const inviteLink = `/crowdsourcing/invite/${inviteToken}`;

    return NextResponse.json({ 
      data: rows[0],
      invite_link: inviteLink,
      message: `Undangan dikirim ke ${email}`
    }, { status: 201 });
  } catch (error: any) {
    console.error('[crowdsourcing/moderators/invite] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
