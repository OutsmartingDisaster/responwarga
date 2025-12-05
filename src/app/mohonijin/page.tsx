'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if user has an active session by making an API call
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const sessionData = await response.json();
          const role = sessionData.data?.user?.role;
          // Redirect admin/super_admin to dashboard if already logged in
          if (role === 'admin' || role === 'super_admin') {
            router.replace('/mohonijin/dashboard');
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
    if (!email || !password) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }

    try {
      // Call the new login API route
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
        credentials: 'include', // Include cookies in the request
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
        setLoading(false);
        return;
      }

      const result = await response.json();

      // Check if user is an admin or super_admin
      const role = result.data?.user?.role;
      if (role === 'admin' || role === 'super_admin') {
        router.replace('/mohonijin/dashboard');
      } else {
        setError('Access Denied: You do not have permission to access this area.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login.');
      setLoading(false);
    }
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