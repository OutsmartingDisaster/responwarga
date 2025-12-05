import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';

// Helper function to check admin status
async function isAdmin(): Promise<boolean> {
  const user = await getSessionFromCookies();
  if (!user) {
    console.error('isAdmin: No user session found');
    return false;
  }

  console.log('isAdmin: User ID:', user.id);
  console.log('isAdmin: User role:', user.role);

  // Check if user has admin or super_admin role
  return hasPermission(user.role, 'admin') || user.role === 'admin' || user.role === 'super_admin';
}

// --- GET Handler (Fetch All Users) ---
export async function GET() {
  // 1. Check admin status
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
  }

  try {
    // Fetch all users and their profiles
    const { rows } = await query(`
      SELECT
        u.id,
        u.email,
        u.role as user_role,
        u.created_at,
        p.id as profile_id,
        p.name as profile_name,
        p.username,
        p.role as profile_role,
        p.organization_id,
        p.organization as profile_organization,
        p.phone,
        p.status as profile_status
      FROM auth.users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY u.created_at DESC
    `);

    // Return the combined list
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('API GET /admin/users: Caught error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: err.message }, { status: 500 });
  }
}

// --- POST Handler (Create User) ---
export async function POST(request: Request) {
  // 1. Check admin status
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
  }

  // 2. Get user details from request body
  let email, password, name, role, organization, organization_id;
  try {
    const body = await request.json();
    email = body.email;
    password = body.password;
    name = body.name;
    role = body.role;
    organization = body.organization;
    organization_id = body.organization_id;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: 'Missing required fields (email, password, name, role)' }, { status: 400 });
  }

  try {
    return await withTransaction(async (client) => {
      // Hash the password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user in auth.users table
      const userResult = await client.query(
        `INSERT INTO auth.users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [email, hashedPassword, role]
      );

      const userId = userResult.rows[0].id;

      // Create profile in profiles table
      await client.query(
        `INSERT INTO profiles (user_id, name, username, role, organization_id, organization, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, name, null, role, organization_id, organization, null, 'active']
      );

      // Return success response
      return NextResponse.json({
        success: true,
        userId: userId,
        email: email
      });
    });
  } catch (err: any) {
    console.error('API POST /admin/users: Error creating user:', err);

    // Check for unique constraint violations (email already exists)
    if (err.message?.includes('duplicate key value violates unique constraint')) {
      return NextResponse.json({
        error: 'User with this email already exists.',
        details: err.message
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create user.',
      details: err.message
    }, { status: 500 });
  }
}

// --- PUT Handler (Edit User) ---
export async function PUT(request: Request) {
  // 1. Check admin status
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
  }

  // 2. Get user details from request body
  let userId, name, role, organization, organization_id, password;
  try {
    const body = await request.json();
    userId = body.userId;
    name = body.name;
    role = body.role;
    organization = body.organization;
    organization_id = body.organization_id;
    password = body.password;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!userId || typeof name === 'undefined' || typeof role === 'undefined' || typeof organization === 'undefined') {
    return NextResponse.json({
      error: 'Missing required fields (userId, name, role, organization)'
    }, { status: 400 });
  }

  try {
    await withTransaction(async (client) => {
      // Update profile data in the 'profiles' table
      await client.query(
        `UPDATE profiles
         SET name = $1, role = $2, organization_id = $3, organization = $4
         WHERE user_id = $5`,
        [name, role, organization_id, organization, userId]
      );

      // Update user role in auth.users if provided
      await client.query(
        `UPDATE auth.users SET role = $1 WHERE id = $2`,
        [role, userId]
      );

      // Update password if provided
      if (password) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query(
          `UPDATE auth.users SET password_hash = $1 WHERE id = $2`,
          [hashedPassword, userId]
        );
      }
    });

    // Return success response
    return NextResponse.json({ success: true, userId: userId });
  } catch (err: any) {
    console.error('API PUT /admin/users: Error updating user:', err);
    return NextResponse.json({
      error: 'Failed to update user.',
      details: err.message
    }, { status: 500 });
  }
}

// --- DELETE Handler (Delete User) ---
export async function DELETE(request: Request) {
  // 1. Check admin status
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
  }

  // 2. Get userId from request body
  let userId;
  try {
    const body = await request.json();
    userId = body.userId;
  } catch {
    return NextResponse.json({
      error: 'Invalid request: Missing userId in body'
    }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({
      error: 'Missing required field (userId)'
    }, { status: 400 });
  }

  try {
    await withTransaction(async (client) => {
      // Delete user profile first (if exists)
      await client.query(
        'DELETE FROM profiles WHERE user_id = $1',
        [userId]
      );

      // Delete user from auth.users
      const result = await client.query(
        'DELETE FROM auth.users WHERE id = $1 RETURNING id',
        [userId]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({
          error: 'User not found in authentication system.'
        }, { status: 404 });
      }
    });

    // Return success response
    return NextResponse.json({ success: true, userId: userId });
  } catch (err: any) {
    console.error('API DELETE /admin/users: Error deleting user:', err);
    return NextResponse.json({
      error: 'Failed to delete user.',
      details: err.message
    }, { status: 500 });
  }
}
