'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react';
import { getSession } from '@/lib/auth/api';

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'login' | 'accepting' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    checkAndAccept();
  }, [token]);

  const checkAndAccept = async () => {
    // Check if logged in
    const user = await getSession();
    if (!user) {
      setStatus('login');
      return;
    }

    // Accept invitation
    setStatus('accepting');
    try {
      const res = await fetch(`/api/crowdsourcing/invites/${token}/accept`, {
        method: 'POST'
      });
      const result = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(result.message);
        setProjectId(result.project_id);
      } else {
        setStatus('error');
        setMessage(result.error);
      }
    } catch (err) {
      setStatus('error');
      setMessage('Terjadi kesalahan');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-4" size={48} />
            <p className="text-zinc-400">Memproses undangan...</p>
          </>
        )}

        {status === 'login' && (
          <>
            <LogIn className="mx-auto text-blue-500 mb-4" size={48} />
            <h1 className="text-xl font-bold text-white mb-2">Login Diperlukan</h1>
            <p className="text-zinc-400 mb-6">
              Silakan login terlebih dahulu untuk menerima undangan moderator.
            </p>
            <Link href={`/masuk?redirect=/crowdsourcing/invite/${token}`}
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white">
              Login
            </Link>
          </>
        )}

        {status === 'accepting' && (
          <>
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-4" size={48} />
            <p className="text-zinc-400">Menerima undangan...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <h1 className="text-xl font-bold text-white mb-2">Berhasil!</h1>
            <p className="text-zinc-400 mb-6">{message}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/moderator/crowdsourcing"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                Buka Dashboard
              </Link>
              {projectId && (
                <Link href={`/moderator/crowdsourcing/${projectId}`}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg">
                  Lihat Project
                </Link>
              )}
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h1 className="text-xl font-bold text-white mb-2">Gagal</h1>
            <p className="text-zinc-400 mb-6">{message}</p>
            <Link href="/crowdsourcing"
              className="inline-block px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg">
              Kembali
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
