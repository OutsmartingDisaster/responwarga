import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts'; // Assuming cors.ts is in _shared
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { User } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => { // Add type for req
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Fetch all users from auth.users
    const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users from authentication.', details: authError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    const authUsers = authUsersData?.users || [];

    // 2. Fetch corresponding profiles
    const userIds = authUsers.map(user => user.id);
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('user_id', userIds);
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // We will not fail the request if profiles are not fetched.
      // Just log the error and proceed with the auth users data.
    }
    const profilesMap = new Map(profilesData?.map(profile => [profile.user_id, profile]));

    // 3. Combine auth.users data with profile data
    const usersWithProfiles = authUsers.map((authUser) => { // Remove : any, infer type
      const profile = profilesMap.get(authUser.id) as any; // Type assertion for profile
      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        profile_name: profile?.name,
        profile_role: profile?.role,
      };
    });

    // 4. Return the combined list
    return new Response(
      JSON.stringify(usersWithProfiles), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) { // Add type for error
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
});
