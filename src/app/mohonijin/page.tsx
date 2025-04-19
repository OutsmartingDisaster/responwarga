'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function AdminLogin() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          // Check if user has admin role
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id) // Ensure this uses user_id
            .maybeSingle(); // Use maybeSingle to handle potential null profile gracefully

          if (profileError) {
             // Log error but don't throw, maybe just sign out
             console.error('Error fetching profile during session check:', profileError);
             await supabase.auth.signOut();
             return;
          }

          if (profileData?.role === 'admin') {
            router.push('/mohonijin/dashboard');
          } else {
            // If not admin or no profile, sign out
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
        // Clear any existing session on error
        await supabase.auth.signOut();
      }
    };
    
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation before calling Supabase
    if (!email || !password) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }

    try {
      // First clear any existing session to ensure a clean login attempt
      // console.log('Attempting sign out before sign in...'); // Debug log
      await supabase.auth.signOut();
      // console.log('Sign out completed.'); // Debug log

      // Sign in with Supabase
      // console.log(`Attempting sign in with email: ${email}`); // Debug log
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Sign in error details:', signInError); // Log the specific Supabase error
        // Provide more specific common errors
        if (signInError.message.includes('Invalid login credentials')) {
           setError('Invalid email or password.');
        } else if (signInError.message.includes('Email not confirmed')) {
           setError('Please confirm your email address first.');
        } else {
           setError(`Login failed: ${signInError.message}`);
        }
        setLoading(false); // Ensure loading stops on error
        return; // Stop execution on sign-in error
      }

      // console.log('Sign in successful, checking session/user data:', data); // Debug log

      if (!data.session?.user) {
        // This case should ideally not happen if signInError is null, but good to handle
        console.error('Sign in succeeded but no session/user data found.');
        setError('Login failed: Could not retrieve user session.');
        setLoading(false);
        return;
      }

      const userId = data.session.user.id;
      // console.log(`User ID found: ${userId}. Fetching profile...`); // Debug log

      // Check if user has admin role - Modified fetch logic
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId) // Ensure we use the correct column name 'user_id'
        // Remove .single() - fetch potential list instead

      if (profileError) {
        console.error('Profile fetch query error details:', profileError); // Log the specific profile error
        await supabase.auth.signOut();
        setError('Login successful, but failed to query user role. Please contact support.');
        setLoading(false);
        return; // Stop execution
      }

      // Check the results
      if (!profiles || profiles.length === 0) {
        console.error('No profile found for user:', userId);
        await supabase.auth.signOut();
        setError('Login successful, but no profile found for this user. Ensure user exists in profiles table.');
        setLoading(false);
        return; // Stop execution
      }

      if (profiles.length > 1) {
        // Should not happen due to UNIQUE constraint, but good practice to check
        console.error('Multiple profiles found for user:', userId);
        await supabase.auth.signOut();
        setError('Login failed: Multiple profiles found for user. Please contact support.');
        setLoading(false);
        return; // Stop execution
      }

      // Exactly one profile found
      const profileData = profiles[0];
      // console.log('Profile data fetched:', profileData); // Debug log

      if (profileData?.role !== 'admin') {
        // console.log(`User role is '${profileData?.role}', not 'admin'. Signing out.`); // Debug log
        await supabase.auth.signOut();
        setError('Access Denied: You do not have permission to access this area.');
        setLoading(false);
        return; // Stop execution
      }

      // If we get here, the user is an admin
      // console.log('Admin user verified. Redirecting to dashboard...'); // Debug log
      router.push('/mohonijin/dashboard');

    } catch (err: any) {
      // Catch any unexpected errors during the process
      console.error('Unhandled login error:', err);
      setError(err.message || 'An unexpected error occurred during login.');
      // Ensure we attempt sign out on unexpected errors too
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.error('Error during sign out after unhandled exception:', signOutErr);
      }
      setLoading(false);
    }
    // setLoading(false); // Removed from here, set in specific error/success paths or finally block if preferred
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-zinc-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white text-center">Admin Login</h2>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-white text-sm">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-zinc-300 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-zinc-700 border-zinc-600 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-zinc-300 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-zinc-700 border-zinc-600 text-white mb-3 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              id="password"
              type="password"
              placeholder="******************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}