import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';

// POST /api/settings/password - Change password
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Get current password hash
    const userResult = await query(
      'SELECT password_hash FROM auth.users WHERE id = $1',
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE auth.users SET password_hash = $1 WHERE id = $2',
      [newHash, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/settings/password error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
