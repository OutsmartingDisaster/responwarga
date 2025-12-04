import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET /api/notifications - List user's notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    let sql = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    const params: any[] = [user.id];

    if (unreadOnly) {
      sql += ' AND read_at IS NULL';
    }

    sql += ' ORDER BY created_at DESC LIMIT $2';
    params.push(limit);

    const result = await query(sql, params);

    // Get unread count
    const countResult = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [user.id]
    );

    return NextResponse.json({
      data: result.rows,
      unread_count: parseInt(countResult.rows[0].count)
    });
  } catch (error: any) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark all as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
