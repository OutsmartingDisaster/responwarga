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
      `SELECT id, name, email, role, created_at 
       FROM profiles 
       WHERE organization_id = $1 
       ORDER BY created_at DESC`,
      [session.profile.organization_id]
    );

    return NextResponse.json({ data: rows });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies(request.cookies);
  if (!session || session.role !== 'org_admin' || !session.profile?.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, email, role } = await request.json();

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO profiles (name, email, role, organization_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, role, session.profile.organization_id]
    );

    // Log activity
    await query(
      `INSERT INTO team_activity_logs (organization_id, user_id, action, details)
       VALUES ($1, $2, 'member_added', $3)`,
      [session.profile.organization_id, session.id, JSON.stringify({ name, email, role })]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromCookies(request.cookies);
  if (!session || session.role !== 'org_admin' || !session.profile?.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, name, email, role } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing member ID' }, { status: 400 });
    }

    const { rows } = await query(
      `UPDATE profiles 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role)
       WHERE id = $4 AND organization_id = $5
       RETURNING id, name, email, role, created_at`,
      [name, email, role, id, session.profile.organization_id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Log activity
    await query(
      `INSERT INTO team_activity_logs (organization_id, user_id, action, details)
       VALUES ($1, $2, 'member_updated', $3)`,
      [session.profile.organization_id, session.id, JSON.stringify({ id, name, email, role })]
    );

    return NextResponse.json({ data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromCookies(request.cookies);
  if (!session || session.role !== 'org_admin' || !session.profile?.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing member ID' }, { status: 400 });
    }

    const { rows } = await query(
      'DELETE FROM profiles WHERE id = $1 AND organization_id = $2 RETURNING name, email',
      [id, session.profile.organization_id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Log activity
    await query(
      `INSERT INTO team_activity_logs (organization_id, user_id, action, details)
       VALUES ($1, $2, 'member_removed', $3)`,
      [session.profile.organization_id, session.id, JSON.stringify(rows[0])]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}
