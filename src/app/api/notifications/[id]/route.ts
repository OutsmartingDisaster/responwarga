import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id] - Mark single notification as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/notifications/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/notifications/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
