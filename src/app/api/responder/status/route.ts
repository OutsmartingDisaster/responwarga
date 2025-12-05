import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// GET /api/responder/status - Get current responder status
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT user_id, full_name, status, role, phone, organization_id,
              (SELECT COUNT(*) FROM assignments WHERE responder_id = $1 AND status IN ('assigned', 'accepted')) as pending_tasks,
              (SELECT COUNT(*) FROM assignments WHERE responder_id = $1 AND status = 'in_progress') as active_tasks,
              (SELECT COUNT(*) FROM assignments WHERE responder_id = $1 AND status = 'completed') as completed_tasks
       FROM profiles WHERE user_id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('GET /api/responder/status error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/responder/status - Update responder status
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['active', 'on_duty', 'off_duty', 'inactive'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be: active, on_duty, off_duty, or inactive' }, { status: 400 });
    }

    const result = await query(
      `UPDATE profiles SET status = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id, full_name, status`,
      [status, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/responder/status error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
