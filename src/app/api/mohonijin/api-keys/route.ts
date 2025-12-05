import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';
import crypto from 'crypto';

// Generate a secure API key
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = 'rw_' + crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 11); // 'rw_' + 8 chars
  return { key, hash, prefix };
}

// GET /api/mohonijin/api-keys - List API keys
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    let sql = `
      SELECT 
        ak.id, ak.name, ak.key_prefix, ak.scopes, ak.rate_limit_per_hour,
        ak.is_active, ak.last_used_at, ak.usage_count, ak.expires_at,
        ak.created_at, ak.organization_id,
        o.name as organization_name,
        p.full_name as created_by_name
      FROM api_keys ak
      LEFT JOIN organizations o ON o.id = ak.organization_id
      LEFT JOIN profiles p ON p.user_id = ak.created_by
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      sql += ` AND ak.organization_id = $${paramIndex++}`;
      params.push(organizationId);
    }

    sql += ' ORDER BY ak.created_at DESC';

    const { rows } = await query(sql, params);

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('GET /api/mohonijin/api-keys error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/mohonijin/api-keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, organization_id, scopes, rate_limit_per_hour, expires_at } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const validScopes = ['read_org_data', 'read_aggregated_data', 'read_public_data', 'write_data'];
    const keyScopes = (scopes || ['read_org_data']).filter((s: string) => validScopes.includes(s));

    const { key, hash, prefix } = generateApiKey();

    const result = await query(
      `INSERT INTO api_keys (name, organization_id, key_hash, key_prefix, scopes, rate_limit_per_hour, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, key_prefix, scopes, rate_limit_per_hour, is_active, expires_at, created_at`,
      [name, organization_id || null, hash, prefix, keyScopes, rate_limit_per_hour || 1000, expires_at || null, user.id]
    );

    // Return the full key only once (on creation)
    return NextResponse.json({
      data: {
        ...result.rows[0],
        key // Full key - only shown once!
      },
      message: 'API key created. Save the key now - it will not be shown again.'
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/mohonijin/api-keys error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
