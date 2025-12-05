import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';

// GET /api/organization/members - List organization members
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

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const orgId = profileResult.rows[0].organization_id;

    if (!orgId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    // Get all members of the organization
    const result = await query(
      `SELECT 
        p.id,
        p.user_id,
        p.name,
        p.full_name,
        p.role,
        p.status,
        p.phone,
        p.latitude,
        p.longitude,
        p.last_location_update
      FROM profiles p
      WHERE p.organization_id = $1
      ORDER BY p.name ASC`,
      [orgId]
    );

    // Normalize name field
    const members = result.rows.map(m => ({
      ...m,
      name: m.name || m.full_name || 'Unknown'
    }));

    return NextResponse.json({ data: members });
  } catch (error: any) {
    console.error('GET /api/organization/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/organization/members - Add new member to organization
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, phone, role } = body;

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0 || !profileResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgId = profileResult.rows[0].organization_id;

    // Check if email already exists
    const existingUser = await query('SELECT id FROM auth.users WHERE email = $1', [email]);
    
    let userId: string;
    
    if (existingUser.rows.length > 0) {
      // User exists, check if already in an organization
      userId = existingUser.rows[0].id;
      const existingProfile = await query('SELECT organization_id FROM profiles WHERE user_id = $1', [userId]);
      
      if (existingProfile.rows.length > 0 && existingProfile.rows[0].organization_id) {
        return NextResponse.json({ error: 'User already belongs to an organization' }, { status: 400 });
      }
      
      // Update existing profile
      await query(
        `UPDATE profiles SET organization_id = $1, role = $2, name = $3::varchar, full_name = $4::text, phone = COALESCE($5::text, phone), updated_at = NOW() WHERE user_id = $6`,
        [orgId, role || 'org_responder', name, name, phone || null, userId]
      );
      
      // Update auth.users role
      await query('UPDATE auth.users SET role = $1 WHERE id = $2', [role || 'org_responder', userId]);
    } else {
      // Create new user with default password
      const defaultPassword = 'responwarga123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      
      const newUserResult = await query(
        `INSERT INTO auth.users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
        [email, passwordHash, role || 'org_responder']
      );
      userId = newUserResult.rows[0].id;
      
      // Create profile
      await query(
        `INSERT INTO profiles (user_id, organization_id, name, full_name, role, phone) VALUES ($1, $2, $3::varchar, $4::text, $5, $6::text)`,
        [userId, orgId, name, name, role || 'org_responder', phone || null]
      );
    }

    // Get the created/updated profile
    const result = await query(
      `SELECT p.*, u.email FROM profiles p JOIN auth.users u ON u.id = p.user_id WHERE p.user_id = $1`,
      [userId]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/organization/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
