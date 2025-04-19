import { createClient } from '@/lib/supabase/server'; // Use the existing server helper
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

// Helper function to check admin status
async function isAdmin(supabase: any): Promise<boolean> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return false;

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    return !profileError && profile?.role === 'admin';
}

// --- GET Handler (Fetch All Users) ---
export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = await createClient();

  // 1. Check admin status
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
  }

  try {
    const supabaseAdmin = createAdminClient();

    // Fetch all users from auth.users
    const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('API GET /admin/users: Error fetching auth users:', authError);
      return NextResponse.json({ error: 'Failed to fetch users from authentication.', details: authError.message }, { status: 500 });
    }

    const authUsers = authUsersData?.users || [];

    // Fetch corresponding profiles
    const userIds = authUsers.map(user => user.id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds);

    if (profilesError) {
       console.error('API GET /admin/users: Error fetching profiles:', profilesError);
       // Continue even if profiles fetch fails, just won't have profile data
    }

    const profilesMap = new Map(profilesData?.map(profile => [profile.user_id, profile]));

    // Combine auth.users data with profile data
    const usersWithDetails = authUsers.map((authUser: any) => {
      const profile = profilesMap.get(authUser.id);
      return {
        ...authUser,
        profile_name: profile?.name,
        profile_organization: profile?.organization,
        profile_role: profile?.role,
        organization_id: profile?.organization_id,
        // Note: memberCount, activeAssignments, disasterResponses are not fetched here
        // as they would require additional queries per org_admin.
        // The client can fetch these details if needed after getting the initial list.
      };
    });

    // Return the combined list
    return NextResponse.json(usersWithDetails);

  } catch (err: any) {
    console.error('API GET /admin/users: Caught error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: err.message }, { status: 500 });
  }
}


// --- POST Handler (Create User) ---
export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = await createClient();

  // 1. Check admin status
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
  }

  // 2. Get user details from request body
  let email, password, name, role, organization; // Added organization
  try {
      const body = await request.json();
      email = body.email;
      password = body.password;
      name = body.name;
      role = body.role;
      organization = body.organization; // Get organization
  } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: 'Missing required fields (email, password, name, role)' }, { status: 400 });
  }

  // 3. Use the Admin client to create the user
  const supabaseAdmin = createAdminClient();
  const { data: newUserResponse, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm email
    user_metadata: { // Store initial profile data in user_metadata
        name: name,
        organization: organization, // Store organization in user_metadata
        role: role, // Store role in user_metadata
    },
  });

  if (createError) {
    console.error('Supabase Admin createUser Error:', createError);
    let errorMessage = 'Failed to create user.';
    if (createError.message.includes('already registered')) {
      errorMessage = 'User with this email already exists.';
    } else if (createError.message.includes('Password should be at least 6 characters')) {
       errorMessage = 'Password must be at least 6 characters long.';
    }
    return NextResponse.json({ error: errorMessage, details: createError.message }, { status: 400 });
  }

  const newUser = newUserResponse?.user;
  if (!newUser) {
     console.error('Supabase Admin createUser Error: No user data returned');
     return NextResponse.json({ error: 'Failed to create user, no user data returned.' }, { status: 500 });
  }

  // 4. Add user details to the 'profiles' table
  // This assumes you have a trigger that automatically creates a profile entry
  // when a new user is inserted into auth.users, populating it with user_metadata.
  // If not, you would manually insert into 'profiles' here using newUser.id and the provided name, role, organization.
  // For now, assuming the trigger exists and handles profile creation.

  // 5. Return success response
  return NextResponse.json({ success: true, userId: newUser.id, email: newUser.email });
}

// --- PUT Handler (Edit User) ---
export async function PUT(request: Request) {
  const cookieStore = cookies();
  const supabase = await createClient();

  // 1. Check admin status
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
  }

  // 2. Get user details from request body
  let userId, name, role, organization, password; // Added organization and password
  try {
      const body = await request.json();
      userId = body.userId;
      name = body.name;
      role = body.role;
      organization = body.organization; // Get organization
      password = body.password; // Get password
  } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!userId || typeof name === 'undefined' || typeof role === 'undefined' || typeof organization === 'undefined') {
    return NextResponse.json({ error: 'Missing required fields (userId, name, role, organization)' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // 3. Update profile data in the 'profiles' table
  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({ name: name, role: role, organization: organization }) // Update organization
    .eq('user_id', userId);

  if (profileUpdateError) {
    console.error('Supabase Admin update profile Error:', profileUpdateError);
    return NextResponse.json({ error: 'Failed to update user profile.', details: profileUpdateError.message }, { status: 500 });
  }

  // 4. Update password if provided using the admin client
  if (password) {
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
    );
    if (authUpdateError) {
        console.error('Supabase Admin update password Error:', authUpdateError);
        // Decide if you want to fail the request or just log a warning
        // For now, we'll log a warning and let the profile update succeed
        console.warn('Supabase Admin update password Warning:', authUpdateError);
    }
  }

  // Optional: Update name, organization, role in auth.users metadata as well (if desired)
  // This might be redundant if your profiles table is the source of truth for these fields
  // and you rely on triggers or joins. However, keeping auth.users metadata in sync
  // can be useful for some auth-related operations.
  const { error: authMetadataUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { name: name, organization: organization, role: role } }
  );
  if (authMetadataUpdateError) {
      console.warn('Supabase Admin update auth metadata Warning:', authMetadataUpdateError);
  }


  // 5. Return success response
  return NextResponse.json({ success: true, userId: userId });
}

// --- DELETE Handler (Delete User) ---
export async function DELETE(request: Request) {
  const cookieStore = cookies();
  const supabase = await createClient();

  // 1. Check admin status
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
  }

  // 2. Get userId from request body or query params
  // Assuming userId is sent in the request body for consistency
  let userId;
  try {
      const body = await request.json();
      userId = body.userId;
  } catch (e) {
       // Fallback: try query parameters if needed, e.g. /api/admin/users?userId=xxx
      // const { searchParams } = new URL(request.url);
      // userId = searchParams.get('userId');
      if (!userId) {
          return NextResponse.json({ error: 'Invalid request: Missing userId in body' }, { status: 400 });
      }
  }

  if (!userId) {
    return NextResponse.json({ error: 'Missing required field (userId)' }, { status: 400 });
  }

  // 3. Use the Admin client to delete the user
  const supabaseAdmin = createAdminClient();

  // 3a. Attempt to delete from 'profiles' first (safer if no cascade delete)
  const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);

  if (profileDeleteError) {
      // Log the error but proceed to delete the auth user anyway
      console.warn(`Supabase Admin delete profile Warning (User ID: ${userId}):`, profileDeleteError);
  }

  // 3b. Delete user from auth.users
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    console.error('Supabase Admin deleteUser Error:', authDeleteError);
    // Handle specific errors, e.g., user not found
    let errorMessage = 'Failed to delete user.';
    if (authDeleteError.message.includes('User not found')) {
        errorMessage = 'User not found in authentication system.';
    } else if (authDeleteError.message.includes('Cannot delete protected user')){
        errorMessage = 'Cannot delete this protected user.';
    }
    return NextResponse.json({ error: errorMessage, details: authDeleteError.message }, { status: authDeleteError.message.includes('User not found') ? 404 : 500 });
  }

  // 4. Return success response
  return NextResponse.json({ success: true, userId: userId });
}
