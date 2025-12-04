'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Flag, MapPin, Loader2 } from 'lucide-react';
import { getSession } from '@/lib/auth/api';
import type { CrowdsourceSubmission } from '@/lib/crowdsourcing/types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-600', approved: 'bg-green-600', rejected: 'bg-red-600', flagged: 'bg-orange-600'
};

export default function ModeratorProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [submissions, setSubmissions] = useState<CrowdsourceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [permissions, setPermissions] = useState({ can_approve: false, can_reject: false, can_flag: false });

  useEffect(() => {
    checkAuth();
  }, [projectId]);

  const checkAuth = async () => {
    const user = await getSession();
    if (!user) { router.push('/masuk'); return; }
    
    // Get permissions
    const projRes = await fetch('/api/crowdsourcing/my-projects');
    const { data: projects } = await projRes.json();
    const myProject = projects?.find((p: any) => p.id === projectId);
    
    if (!myProject) {
      router.push('/moderator/crowdsourcing');
      return;
    }
    
    setPermissions({
      can_approve: myProject.can_approve,
      can_reject: myProject.can_reject,
      can_flag: myProject.can_flag
    });
    
    fetchSubmissions();
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/crowdsourcing/projects/${projectId}/submissions?all=true`);
      const { data } = await res.json();
      setSubmissions(data || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, status: 'approved' | 'rejected' | 'flagged') => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/crowdsourcing/submissions/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      }
    } catch (err) {
      console.error('Failed to verify:', err);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter);

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/moderator/crowdsourcing"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-2">
            <ArrowLeft size={18} /> Kembali
          </Link>
          <h1 className="text-xl font-bold">Moderasi Submissions</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['pending', 'approved', 'rejected', 'flagged', 'all'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                filter === s ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700'
              }`}>
              {s} ({s === 'all' ? submissions.length : submissions.filter(x => x.status === s).length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-zinc-500">Tidak ada submissions</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(sub => (
              <div key={sub.id} className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
                <div className="aspect-video bg-zinc-900 relative">
                  {sub.media_type === 'video' ? (
                    <video src={sub.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={sub.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full ${statusColors[sub.status]}`}>
                    {sub.status}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm line-clamp-2 mb-2">{sub.caption}</p>
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin size={12} /> {sub.address}
                  </p>

                  {sub.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      {permissions.can_approve && (
                        <button onClick={() => handleVerify(sub.id, 'approved')}
                          disabled={processing === sub.id}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm disabled:opacity-50">
                          <Check size={14} /> Approve
                        </button>
                      )}
                      {permissions.can_reject && (
                        <button onClick={() => handleVerify(sub.id, 'rejected')}
                          disabled={processing === sub.id}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm disabled:opacity-50">
                          <X size={14} /> Reject
                        </button>
                      )}
                      {permissions.can_flag && (
                        <button onClick={() => handleVerify(sub.id, 'flagged')}
                          disabled={processing === sub.id}
                          className="p-2 bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50">
                          <Flag size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
