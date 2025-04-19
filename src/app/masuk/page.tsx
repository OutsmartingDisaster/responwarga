'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from "@/contexts/SupabaseClientProvider";

export default function MasukPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<'responder' | 'org_admin'>('responder');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError("Supabase client is not available. Please try again shortly.");
      setLoading(false);
      return;
    }

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            role: role,
          },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();
          if (profile?.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('slug')
              .eq('id', profile.organization_id)
              .single();
            if (orgData?.slug) {
              console.log(`[Login Debug] Responder User: ${user.id}, Org ID: ${profile.organization_id}, Found Slug: ${orgData.slug}, Redirecting...`);
              router.push(`/responder/${orgData.slug}/dashboard`);
            } else {
              console.error(`[Login Debug] Responder User: ${user.id}, Org ID: ${profile.organization_id}, Slug NOT FOUND! Setting error.`);
              setError('Organisasi tidak ditemukan.');
            }
          } else {
            setError('Akun belum terhubung ke organisasi.');
          }
        } else {
          setError('Gagal mendapatkan data pengguna.');
        }
      }
    } else {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email: username, password });

      if (loginError) {
        setError(loginError.message);
      } else if (loginData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, organization_id')
          .eq('user_id', loginData.user.id)
          .single();

        if (profileError) {
          setError('Failed to fetch user profile.');
        } else if (profile) {
          if (profile.role === 'org_admin') {
            if (profile.organization_id) {
              const { data: orgData } = await supabase
                .from('organizations')
                .select('slug')
                .eq('id', profile.organization_id)
                .single();
              if (orgData?.slug) {
                console.log(`[Login Debug] Admin User: ${loginData.user.id}, Org ID: ${profile.organization_id}, Found Slug: ${orgData.slug}, Redirecting...`);
                router.push(`/responder/${orgData.slug}/dashboard`);
              } else {
                console.warn(`[Login Debug] Admin User: ${loginData.user.id}, Org ID: ${profile.organization_id}, Slug NOT FOUND! Redirecting to onboarding.`);
                router.push('/onboarding/organization');
              }
            } else {
              console.log(`[Login Debug] Admin User: ${loginData.user.id}, No Org ID found. Redirecting to onboarding.`);
              router.push('/onboarding/organization');
            }
          } else {
            if (profile.organization_id) {
              const { data: orgData } = await supabase
                .from('organizations')
                .select('slug')
                .eq('id', profile.organization_id)
                .single();
              if (orgData?.slug) {
                console.log(`[Login Debug] Responder User: ${loginData.user.id}, Org ID: ${profile.organization_id}, Found Slug: ${orgData.slug}, Redirecting...`);
                router.push(`/responder/${orgData.slug}/dashboard`);
              } else {
                console.error(`[Login Debug] Responder User: ${loginData.user.id}, Org ID: ${profile.organization_id}, Slug NOT FOUND! Setting error.`);
                setError('Organisasi tidak ditemukan.');
              }
            } else {
              console.error(`[Login Debug] Responder User: ${loginData.user.id}, Org ID: null. Setting error.`);
              setError('Akun belum terhubung ke organisasi.');
            }
          }
        } else {
          console.error(`[Login Debug] User: ${loginData.user.id}, Profile NOT FOUND! Setting error.`);
          setError('User profile not found.');
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">{isRegister ? 'Daftar Akun' : 'Masuk'}</h1>
      <form className="space-y-4 w-full max-w-sm" onSubmit={handleSubmit}>
        <input
          type={isRegister ? "text" : "email"}
          placeholder={isRegister ? "Username" : "Email"}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-600"
        />
        {isRegister && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-600"
            />
            <div className="flex items-center space-x-4">
              <label className="text-zinc-400">Daftar sebagai:</label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="responder"
                  checked={role === 'responder'}
                  onChange={() => setRole('responder')}
                  className="mr-1"
                />
                Responder
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="org_admin"
                  checked={role === 'org_admin'}
                  onChange={() => setRole('org_admin')}
                  className="mr-1"
                />
                Admin Organisasi
              </label>
            </div>
          </>
        )}
        <input
          type="password"
          placeholder="Kata Sandi"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-600"
        />
        {error && <div className="text-red-400">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Memproses...' : isRegister ? 'Daftar' : 'Masuk'}
        </button>
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="w-full p-2 bg-zinc-700 rounded hover:bg-zinc-600 mt-2"
        >
          {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
        </button>
      </form>
    </div>
  );
}
