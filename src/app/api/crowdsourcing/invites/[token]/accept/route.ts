import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// POST - Accept moderator invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Please login first' }, { status: 401 });
    }

    const { token } = await params;

    // Find invite
    const { rows: invites } = await query(
      `SELECT * FROM crowdsource_moderator_invites 
       WHERE invite_token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    if (!invites.length) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    const invite = invites[0];

    // Check if email matches
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({ 
        error: `Undangan ini untuk ${invite.email}. Login dengan email tersebut.` 
      }, { status: 403 });
    }

    // Check if already a moderator
    const { rows: existing } = await query(
      `SELECT * FROM crowdsource_moderators WHERE user_id = $1 AND project_id = $2`,
      [user.id, invite.project_id]
    );

    if (existing.length) {
      // Update existing
      await query(
        `UPDATE crowdsource_moderators 
         SET status = 'active', can_approve = $1, can_reject = $2, can_flag = $3, can_export = $4, accepted_at = NOW()
         WHERE user_id = $5 AND project_id = $6`,
        [invite.can_approve, invite.can_reject, invite.can_flag, invite.can_export, user.id, invite.project_id]
      );
    } else {
      // Create new moderator
      await query(
        `INSERT INTO crowdsource_moderators 
         (user_id, project_id, can_approve, can_reject, can_flag, can_export, invited_by, status, accepted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())`,
        [user.id, invite.project_id, invite.can_approve, invite.can_reject, invite.can_flag, invite.can_export, invite.invited_by]
      );
    }

    // Mark invite as accepted
    await query(
      `UPDATE crowdsource_moderator_invites SET accepted_at = NOW() WHERE id = $1`,
      [invite.id]
    );

    // Get project info
    const { rows: projects } = await query(
      `SELECT title FROM crowdsource_projects WHERE id = $1`,
      [invite.project_id]
    );

    return NextResponse.json({ 
      success: true,
      project_id: invite.project_id,
      project_title: projects[0]?.title,
      message: 'Anda sekarang menjadi moderator untuk project ini'
    });
  } catch (error: any) {
    console.error('[crowdsourcing/invites/accept] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
