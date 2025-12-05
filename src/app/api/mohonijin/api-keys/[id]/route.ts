import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/mohonijin/api-keys/[id] - Get API key details with usage stats
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyResult = await query(
      `SELECT 
        ak.*, o.name as organization_name, p.full_name as created_by_name
       FROM api_keys ak
       LEFT JOIN organizations o ON o.id = ak.organization_id
       LEFT JOIN profiles p ON p.user_id = ak.created_by
       WHERE ak.id = $1`,
      [id]
    );

    if (keyResult.rows.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Get recent usage
    const usageResult = await query(
      `SELECT endpoint, method, status_code, response_time_ms, created_at
       FROM api_key_usage_log
       WHERE api_key_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [id]
    );

    // Get usage stats
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_requests,
        AVG(response_time_ms)::int as avg_response_time,
        COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as requests_last_hour
       FROM api_key_usage_log
       WHERE api_key_id = $1`,
      [id]
    );

    return NextResponse.json({
      data: {
        ...keyResult.rows[0],
        key_hash: undefined, // Don't expose hash
        recent_usage: usageResult.rows,
        stats: statsResult.rows[0]
      }
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/api-keys/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/mohonijin/api-keys/[id] - Update API key
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, scopes, rate_limit_per_hour, is_active, expires_at } = body;

    const updates: string[] = [];
    const params_arr: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params_arr.push(name);
    }
    if (scopes !== undefined) {
      updates.push(`scopes = $${paramIndex++}`);
      params_arr.push(scopes);
    }
    if (rate_limit_per_hour !== undefined) {
      updates.push(`rate_limit_per_hour = $${paramIndex++}`);
      params_arr.push(rate_limit_per_hour);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params_arr.push(is_active);
    }
    if (expires_at !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      params_arr.push(expires_at);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    params_arr.push(id);

    const result = await query(
      `UPDATE api_keys SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, key_prefix, scopes, rate_limit_per_hour, is_active, expires_at, updated_at`,
      params_arr
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/mohonijin/api-keys/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/mohonijin/api-keys/[id] - Revoke API key
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query('DELETE FROM api_keys WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API key revoked successfully' });
  } catch (error: any) {
    console.error('DELETE /api/mohonijin/api-keys/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
