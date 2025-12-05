import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/org/api-keys/[id] - Revoke org API key
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileResult = await query(
      'SELECT organization_id, role FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0 || !profileResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const { organization_id: orgId, role } = profileResult.rows[0];
    if (role !== 'org_admin' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only delete if key belongs to this org
    const result = await query(
      'DELETE FROM api_keys WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API key revoked' });
  } catch (error: any) {
    console.error('DELETE /api/org/api-keys/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
