'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth/api';
import { getOrgSlug } from '@/lib/auth/redirect';

/**
 * Legacy /admin route - redirects to proper org admin dashboard
 */
export default function AdminRedirectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function redirect() {
      try {
        const user = await getSession();
        
        if (!user) {
          router.replace('/masuk');
          return;
        }

        // Super admin goes to mohonijin
        if (user.role === 'super_admin' || user.role === 'admin') {
          router.replace('/mohonijin/dashboard');
          return;
        }

        // Org admin/responder needs organization
        const orgId = user.profile?.organization_id;
        if (!orgId) {
          router.replace('/onboarding/organization');
          return;
        }

        const slug = await getOrgSlug(orgId);
        if (!slug) {
          setError('Organisasi tidak ditemukan');
          return;
        }

        // Redirect based on role
        if (user.role === 'org_admin' || user.profile?.role === 'org_admin') {
          router.replace(`/${slug}/admin/dashboard`);
        } else {
          router.replace(`/${slug}/responder/dashboard`);
        }
      } catch (err) {
        console.error('Redirect error:', err);
        setError('Terjadi kesalahan');
      }
    }

    redirect();
  }, [router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push('/masuk')} className="text-blue-400 hover:underline">
            Kembali ke halaman login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-slate-400">Mengalihkan ke dashboard...</p>
      </div>
    </div>
  );
}
