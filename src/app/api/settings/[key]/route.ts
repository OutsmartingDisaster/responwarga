import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET /api/settings/[key] - Get setting by key (public for some keys)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    
    const { rows } = await query(
      'SELECT value FROM site_settings WHERE key = $1',
      [key]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0].value });
  } catch (error: any) {
    console.error('[settings] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/settings/[key] - Update setting (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    
    // Check auth
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { rows } = await query(
      `INSERT INTO site_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(body), user.id]
    );

    return NextResponse.json({ data: rows[0] });
  } catch (error: any) {
    console.error('[settings] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
