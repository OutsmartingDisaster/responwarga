import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';
import crypto from 'crypto';

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = 'rw_' + crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 11);
  return { key, hash, prefix };
}

// GET /api/org/api-keys - List org's API keys
export async function GET(request: NextRequest) {
  try {
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

    const { rows } = await query(`
      SELECT id, name, key_prefix, scopes, rate_limit_per_hour, is_active, 
             last_used_at, usage_count, expires_at, created_at
      FROM api_keys
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `, [orgId]);

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('GET /api/org/api-keys error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/org/api-keys - Create org API key
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { name } = body;

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    // Org keys are limited to read_org_data scope
    const scopes = ['read_org_data'];
    const { key, hash, prefix } = generateApiKey();

    const result = await query(
      `INSERT INTO api_keys (name, organization_id, key_hash, key_prefix, scopes, rate_limit_per_hour, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, key_prefix, scopes, rate_limit_per_hour, is_active, created_at`,
      [name, orgId, hash, prefix, scopes, 500, user.id]
    );

    return NextResponse.json({
      data: { ...result.rows[0], key },
      message: 'API key created. Save the key now - it will not be shown again.'
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/org/api-keys error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
