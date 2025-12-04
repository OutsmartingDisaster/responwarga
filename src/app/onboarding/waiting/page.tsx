'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Building2, UserCheck, ArrowRight, LogOut } from 'lucide-react';

export default function WaitingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session and user status
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include'
        });
        const result = await response.json();
        
        if (!response.ok || !result.data?.user) {
          router.push('/masuk');
          return;
        }

        const userData = result.data.user;
        setUser(userData);

        // If user now has an organization, redirect to dashboard based on role
        if (userData.profile?.organization_id) {
          const orgResponse = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'select',
              table: 'organizations',
              columns: 'slug',
              filters: [{ column: 'id', operator: 'eq', value: userData.profile.organization_id }]
            })
          });

          if (orgResponse.ok) {
            const orgResult = await orgResponse.json();
            if (orgResult.data && orgResult.data.length > 0) {
              const slug = orgResult.data[0].slug;
              const role = userData.profile?.role || userData.role;
              if (role === 'org_admin') {
                router.push(`/${slug}/admin/dashboard`);
              } else {
                router.push(`/${slug}/responder/dashboard`);
              }
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
    
    // Poll every 30 seconds to check if user has been added to an organization
    const interval = setInterval(checkSession, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/masuk');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Status Card */}
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-8 shadow-xl text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/20 rounded-full mb-6">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-3">Menunggu Persetujuan</h1>
          
          {/* Description */}
          <p className="text-zinc-400 mb-8">
            Akun Anda telah berhasil dibuat. Silakan hubungi admin organisasi untuk 
            ditambahkan ke dalam tim responder.
          </p>

          {/* User Info */}
          {user && (
            <div className="bg-zinc-900/50 rounded-lg p-4 mb-8">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold">
                    {user.profile?.name?.charAt(0) || user.email?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="text-left">
                  <div className="font-medium">{user.profile?.name || 'Pengguna'}</div>
                  <div className="text-sm text-zinc-400">{user.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="text-left space-y-4 mb-8">
            <h3 className="font-medium text-zinc-300">Langkah selanjutnya:</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-zinc-900/30 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">1</span>
                </div>
                <div>
                  <div className="font-medium">Hubungi Admin Organisasi</div>
                  <div className="text-sm text-zinc-400">
                    Minta admin untuk menambahkan email Anda ke dalam organisasi
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-zinc-900/30 rounded-lg">
                <div className="w-6 h-6 bg-zinc-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">2</span>
                </div>
                <div>
                  <div className="font-medium text-zinc-400">Tunggu Konfirmasi</div>
                  <div className="text-sm text-zinc-500">
                    Halaman ini akan otomatis terupdate saat Anda ditambahkan
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-zinc-900/30 rounded-lg">
                <div className="w-6 h-6 bg-zinc-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">3</span>
                </div>
                <div>
                  <div className="font-medium text-zinc-400">Akses Dashboard</div>
                  <div className="text-sm text-zinc-500">
                    Setelah ditambahkan, Anda akan diarahkan ke dashboard
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full p-3 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5" />
              Cek Status
            </button>
            <button
              onClick={handleLogout}
              className="w-full p-3 bg-zinc-700 rounded-lg font-medium hover:bg-zinc-600 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </div>
        </div>

        {/* Alternative: Create Organization */}
        <div className="mt-6 text-center">
          <p className="text-zinc-500 mb-3">Atau ingin membuat organisasi sendiri?</p>
          <button
            onClick={() => router.push('/onboarding/organization')}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors inline-flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Buat Organisasi Baru
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
