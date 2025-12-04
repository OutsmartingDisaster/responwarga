import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies(request.cookies);
  if (!session || !session.profile?.organization_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rows } = await query(
      'SELECT id, name, slug, logo_url, settings, updated_at FROM organizations WHERE id = $1',
      [session.profile.organization_id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies(request.cookies);
  if (!session || session.role !== 'org_admin' || !session.profile?.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { logo_url, settings } = body;

    const { rows } = await query(
      `UPDATE organizations 
       SET logo_url = COALESCE($1, logo_url),
           settings = COALESCE($2, settings),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, slug, logo_url, settings, updated_at`,
      [logo_url, settings ? JSON.stringify(settings) : null, session.profile.organization_id]
    );

    // Log activity
    await query(
      `INSERT INTO team_activity_logs (organization_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [
        session.profile.organization_id,
        session.id,
        logo_url ? 'logo_updated' : 'settings_updated',
        JSON.stringify({ logo_url, settings })
      ]
    );

    return NextResponse.json({ data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
