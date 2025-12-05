import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET /api/settings/organization - Get organization details
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0 || !profileResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const result = await query(
      'SELECT * FROM organizations WHERE id = $1',
      [profileResult.rows[0].organization_id]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('GET /api/settings/organization error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/settings/organization - Update organization (org_admin only)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only org_admin can update organization
    if (user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0 || !profileResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const orgId = profileResult.rows[0].organization_id;
    const body = await request.json();
    const { name, description, contact_email, contact_phone, address, website } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
      updates.push(`short_description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (contact_email !== undefined) {
      updates.push(`contact_email = $${paramIndex}`);
      values.push(contact_email);
      paramIndex++;
      updates.push(`email = $${paramIndex}`);
      values.push(contact_email);
      paramIndex++;
    }

    if (contact_phone !== undefined) {
      updates.push(`contact_phone = $${paramIndex}`);
      values.push(contact_phone);
      paramIndex++;
      updates.push(`phone = $${paramIndex}`);
      values.push(contact_phone);
      paramIndex++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramIndex}`);
      values.push(address);
      paramIndex++;
    }

    if (website !== undefined) {
      updates.push(`website = $${paramIndex}`);
      values.push(website);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(orgId);

    const result = await query(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/settings/organization error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
