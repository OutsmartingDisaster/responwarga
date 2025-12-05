'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Flag, MapPin, Loader2, Clock, User, Phone, Mail, Eye } from 'lucide-react';
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
  const [selected, setSelected] = useState<CrowdsourceSubmission | null>(null);

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
                <div className="aspect-video bg-zinc-900 relative cursor-pointer" onClick={() => setSelected(sub)}>
                  {sub.media_type === 'video' ? (
                    <video src={sub.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={sub.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full ${statusColors[sub.status]}`}>
                    {sub.status}
                  </span>
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition flex items-center justify-center opacity-0 hover:opacity-100">
                    <Eye size={24} className="text-white" />
                  </div>
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

        {/* Detail Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="relative">
                {selected.media_type === 'video' ? (
                  <video src={selected.media_url} controls className="w-full rounded-t-2xl max-h-[50vh] object-contain bg-black" />
                ) : (
                  <img src={selected.media_url} alt="" className="w-full rounded-t-2xl max-h-[50vh] object-contain bg-black" />
                )}
                <button onClick={() => setSelected(null)} className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full">
                  <X size={20} />
                </button>
                <span className={`absolute top-3 left-3 px-3 py-1 text-sm rounded-full ${statusColors[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
              
              <div className="p-5 space-y-4">
                <p className="text-lg">{selected.caption}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2 text-zinc-400">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{selected.address}{selected.address_detail && ` - ${selected.address_detail}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Clock size={16} />
                    <span>{new Date(selected.submitted_at).toLocaleString('id-ID')}</span>
                  </div>
                  {selected.submitter_name && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <User size={16} />
                      <span>{selected.submitter_name}</span>
                    </div>
                  )}
                  {selected.submitter_email && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Mail size={16} />
                      <span>{selected.submitter_email}</span>
                    </div>
                  )}
                  {selected.submitter_whatsapp && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Phone size={16} />
                      <span>{selected.submitter_whatsapp}</span>
                    </div>
                  )}
                </div>

                {selected.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-zinc-700">
                    {permissions.can_approve && (
                      <button onClick={() => { handleVerify(selected.id, 'approved'); setSelected(null); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg">
                        <Check size={18} /> Approve
                      </button>
                    )}
                    {permissions.can_reject && (
                      <button onClick={() => { handleVerify(selected.id, 'rejected'); setSelected(null); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg">
                        <X size={18} /> Reject
                      </button>
                    )}
                    {permissions.can_flag && (
                      <button onClick={() => { handleVerify(selected.id, 'flagged'); setSelected(null); }}
                        className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 rounded-lg">
                        <Flag size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
