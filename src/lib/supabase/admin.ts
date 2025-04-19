import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ensure these environment variables are set in your deployment environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  console.log('createAdminClient: Attempting to create Supabase admin client...');
  console.log('createAdminClient: NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Loaded' : 'Undefined');
  console.log('createAdminClient: SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'Loaded' : 'Undefined');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('createAdminClient: Missing environment variables!');
    throw new Error('Supabase URL or Service Role Key is missing in environment variables for admin client.');
  }

  // Create a singleton instance to avoid creating multiple clients
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            // It's generally recommended to disable auto-refresh for server-side/admin clients
            autoRefreshToken: false,
            persistSession: false
        }
    });
  }

  return supabaseAdmin;
}
