'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Flag, MapPin, Mail, Phone, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import type { CrowdsourceSubmission } from '@/lib/crowdsourcing/types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-600', approved: 'bg-green-600', rejected: 'bg-red-600', flagged: 'bg-orange-600'
};

export default function SubmissionsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [submissions, setSubmissions] = useState<CrowdsourceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState<CrowdsourceSubmission | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [projectId]);

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

  const handleVerify = async (id: string, status: 'approved' | 'rejected' | 'flagged', reason?: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/crowdsourcing/submissions/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejection_reason: reason })
      });
      if (res.ok) {
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
        setSelected(null);
      }
    } catch (err) {
      console.error('Failed to verify:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleVerifyLocation = async (id: string) => {
    const notes = prompt('Catatan verifikasi lokasi (opsional):');
    setProcessing(id);
    try {
      const res = await fetch(`/api/crowdsourcing/submissions/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_verified: true, moderator_notes: notes })
      });
      if (res.ok) {
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, location_verified: true } as any : s));
      }
    } catch (err) {
      console.error('Failed to verify location:', err);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter);

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href={`/mohonijin/crowdsourcing/${projectId}`}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-2">
            <ArrowLeft size={18} /> Kembali
          </Link>
          <h1 className="text-xl font-bold">Moderasi Submissions</h1>
          <p className="text-sm text-zinc-400">{submissions.length} total submissions</p>
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
                {/* Media */}
                <div className="aspect-video bg-zinc-900 relative">
                  {sub.media_type === 'video' ? (
                    <video src={sub.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={sub.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full ${statusColors[sub.status]}`}>
                    {sub.status}
                  </span>
                  {(sub as any).location_uncertain && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-xs rounded-full bg-orange-500/80 flex items-center gap-1">
                      <AlertTriangle size={10} /> Lokasi Tidak Pasti
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="text-sm line-clamp-2 mb-2">{sub.caption}</p>
                  <p className="text-xs text-zinc-400 flex items-center gap-1 mb-1">
                    <MapPin size={12} /> {sub.address}
                    {(sub as any).location_uncertain && (
                      <span className="text-orange-400">({(sub as any).location_level})</span>
                    )}
                  </p>
                  {(sub as any).location_uncertain && (
                    <div className={`text-xs px-2 py-1 rounded mt-1 flex items-center gap-1 ${
                      (sub as any).location_verified 
                        ? 'bg-green-500/10 text-green-400' 
                        : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {(sub as any).location_verified 
                        ? <><CheckCircle size={10} /> Lokasi Terverifikasi</>
                        : <><AlertTriangle size={10} /> Perlu Verifikasi Lokasi</>
                      }
                    </div>
                  )}
                  <p className="text-xs text-zinc-500">
                    {new Date(sub.submitted_at).toLocaleString('id-ID')}
                  </p>

                  {/* Submitter */}
                  <div className="mt-3 pt-3 border-t border-zinc-700 text-xs text-zinc-400">
                    <p>{sub.submitter_name}</p>
                    <p className="flex items-center gap-1"><Mail size={10} /> {sub.submitter_email}</p>
                    <p className="flex items-center gap-1"><Phone size={10} /> {sub.submitter_whatsapp}</p>
                  </div>

                  {/* Actions */}
                  {sub.status === 'pending' && (
                    <div className="space-y-2 mt-3">
                      {/* Location Verify Button for uncertain locations */}
                      {(sub as any).location_uncertain && !(sub as any).location_verified && (
                        <button onClick={() => handleVerifyLocation(sub.id)}
                          disabled={processing === sub.id}
                          className="w-full flex items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm disabled:opacity-50">
                          <MapPin size={14} /> Verifikasi Lokasi
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleVerify(sub.id, 'approved')}
                          disabled={processing === sub.id}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm disabled:opacity-50">
                          <Check size={14} /> Approve
                        </button>
                        <button onClick={() => handleVerify(sub.id, 'rejected')}
                          disabled={processing === sub.id}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm disabled:opacity-50">
                          <X size={14} /> Reject
                        </button>
                        <button onClick={() => handleVerify(sub.id, 'flagged')}
                          disabled={processing === sub.id}
                          className="p-2 bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50">
                          <Flag size={14} />
                        </button>
                      </div>
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
