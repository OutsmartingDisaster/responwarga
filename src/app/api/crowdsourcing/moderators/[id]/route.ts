import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// PUT - Update moderator permissions
export async function PUT(
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

    const { id } = await params;
    const { can_approve, can_reject, can_flag, can_export, status } = await request.json();

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (can_approve !== undefined) { updates.push(`can_approve = $${idx++}`); values.push(can_approve); }
    if (can_reject !== undefined) { updates.push(`can_reject = $${idx++}`); values.push(can_reject); }
    if (can_flag !== undefined) { updates.push(`can_flag = $${idx++}`); values.push(can_flag); }
    if (can_export !== undefined) { updates.push(`can_export = $${idx++}`); values.push(can_export); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }

    if (!updates.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const { rows } = await query(
      `UPDATE crowdsource_moderators SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Moderator not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error: any) {
    console.error('[crowdsourcing/moderators] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Revoke moderator access
export async function DELETE(
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

    const { id } = await params;
    const { rowCount } = await query(
      `UPDATE crowdsource_moderators SET status = 'revoked' WHERE id = $1`,
      [id]
    );

    if (!rowCount) {
      return NextResponse.json({ error: 'Moderator not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[crowdsourcing/moderators] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
