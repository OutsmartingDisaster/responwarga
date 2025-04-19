import { createClient } from '@/lib/supabase/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // For server-side auth context
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/lib/supabase/server'; // Use server client for admin actions

export async function POST(request: Request) {
  const { invitee_email, organization_id } = await request.json();
  const cookieStore = cookies();
  // Create a client based on the request cookies to get the current user securely
  const supabaseUserClient = createRouteHandlerClient({ cookies: () => cookieStore });

  // --- IMPORTANT: Create Admin Client using SERVICE_ROLE_KEY ---
  // This assumes you have a helper function `createAdminClient` or similar
  // that securely initializes the Supabase client with the service role key
  // stored ONLY in server-side environment variables (e.g., SUPABASE_SERVICE_ROLE_KEY).
  // NEVER expose the service role key to the client-side.
  const supabaseAdmin = createAdminClient(); // Use your admin client creator

  if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client configuration error.' }, { status: 500 });
  }

  if (!invitee_email || !organization_id) {
    return NextResponse.json({ error: 'Email and organization ID are required.' }, { status: 400 });
  }

  try {
    // 1. Get current user making the request
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      console.error('API Route: User not authenticated', userError);
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    // 2. Verify Inviter Role (using Admin client for DB access)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profileData) {
       console.error('API Route: Inviter profile error:', profileError);
       return NextResponse.json({ error: 'Could not verify inviter permissions.' }, { status: 403 });
    }

    // 3. Check if the inviter is an org_admin of the target organization
    if (profileData.role !== 'org_admin' || profileData.organization_id !== organization_id) {
       console.warn('API Route: Permission denied:', { inviterId: user.id, inviterRole: profileData.role, inviterOrg: profileData.organization_id, targetOrg: organization_id });
       return NextResponse.json({ error: 'Permission denied to invite members to this organization.' }, { status: 403 });
    }

    // 4. Invite the user using the Admin client
    const roleToAssign = 'org_responder'; // Hardcode the role
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      invitee_email,
      {
        data: { // Pass data to be stored in raw_app_meta_data (used by trigger)
          organization_id: organization_id,
          role_to_assign: roleToAssign
        },
        // Optional: Redirect URL after accepting invite
        // redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback` 
      }
    );

    if (inviteError) {
      console.error('API Route: Invite error:', inviteError);
      let errorMessage = inviteError.message;
       if (errorMessage.includes('User already registered')) {
          errorMessage = 'User is already registered. They cannot be invited again.';
       } else if (errorMessage.includes('valid email')) {
          errorMessage = 'Please provide a valid email address.';
       }
      return NextResponse.json({ error: `Failed to send invitation: ${errorMessage}` }, { status: 400 });
    }

    console.log('API Route: Invite sent successfully to:', invitee_email);
    return NextResponse.json({ message: `Invitation sent successfully to ${invitee_email}.` });

  } catch (error: any) {
    console.error('API Route: Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
} 