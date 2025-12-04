import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.profile?.role || user.role;
    
    // Check if admin or moderator
    let canVerify = role === 'admin' || role === 'super_admin' || role === 'co_super_admin';
    
    if (!canVerify) {
      // Check if user is moderator for this submission's project
      const { id } = await params;
      const { rows: subs } = await query(
        'SELECT project_id FROM crowdsource_submissions WHERE id = $1',
        [id]
      );
      
      if (subs.length) {
        const { rows: mods } = await query(
          `SELECT * FROM crowdsource_moderators 
           WHERE user_id = $1 AND project_id = $2 AND status = 'active' AND can_approve = true`,
          [user.id, subs[0].project_id]
        );
        canVerify = mods.length > 0;
      }
    }

    if (!canVerify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, rejection_reason, location_verified, moderator_notes } = body;

    // Handle location verification only
    if (location_verified !== undefined && !status) {
      const { rows } = await query(
        `UPDATE crowdsource_submissions 
         SET location_verified = $1, moderator_notes = COALESCE($2, moderator_notes), verified_by = $3
         WHERE id = $4 RETURNING *`,
        [location_verified, moderator_notes, user.id, id]
      );
      if (!rows.length) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }
      return NextResponse.json({ data: rows[0] });
    }

    // Handle status change
    if (!['approved', 'rejected', 'flagged', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { rows } = await query(
      `UPDATE crowdsource_submissions 
       SET status = $1, verified_by = $2, verified_at = NOW(), rejection_reason = $3,
           moderator_notes = COALESCE($4, moderator_notes)
       WHERE id = $5 RETURNING *`,
      [status, user.id, rejection_reason || null, moderator_notes, id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error: any) {
    console.error('[crowdsourcing/verify] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
