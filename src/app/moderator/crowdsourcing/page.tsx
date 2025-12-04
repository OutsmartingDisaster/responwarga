'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, MapPin, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { getSession } from '@/lib/auth/api';

interface ModeratorProject {
  id: string; title: string; disaster_type: string; location_name: string;
  status: string; pending_count: number; can_approve: boolean; can_reject: boolean;
}

export default function ModeratorDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ModeratorProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const user = await getSession();
    if (!user) { router.push('/masuk'); return; }
    fetchProjects();
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/crowdsourcing/my-projects');
      const { data } = await res.json();
      setProjects(data || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera size={24} /> Moderator Dashboard
          </h1>
          <p className="text-zinc-400 text-sm">Project yang Anda moderasi</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <Camera size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">Anda belum menjadi moderator project apapun</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map(p => (
              <Link key={p.id} href={`/moderator/crowdsourcing/${p.id}`}>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 hover:border-blue-500/50 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{p.title}</h3>
                      <p className="text-sm text-zinc-400 flex items-center gap-1 mt-1">
                        <MapPin size={14} /> {p.location_name || 'Lokasi tidak tersedia'}
                      </p>
                    </div>
                    {p.pending_count > 0 && (
                      <span className="flex items-center gap-1 px-3 py-1 bg-orange-600/20 text-orange-400 rounded-full text-sm">
                        <AlertCircle size={14} /> {p.pending_count} pending
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {p.can_approve && <span className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded">Approve</span>}
                    {p.can_reject && <span className="text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded">Reject</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
