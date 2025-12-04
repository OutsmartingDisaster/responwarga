'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Check, X, Mail, Loader2, Copy, Trash2 } from 'lucide-react';

interface Moderator {
  id: string; user_id: string; user_name: string; email: string;
  can_approve: boolean; can_reject: boolean; can_flag: boolean; can_export: boolean;
  status: string; accepted_at: string;
}
interface Invite {
  id: string; email: string; invited_at: string; expires_at: string;
}

export default function ModeratorsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePerms, setInvitePerms] = useState({ can_approve: true, can_reject: true, can_flag: true, can_export: false });
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [projectId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/crowdsourcing/projects/${projectId}/moderators`);
      const { data } = await res.json();
      setModerators(data?.moderators || []);
      setInvites(data?.invites || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.includes('@')) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/crowdsourcing/projects/${projectId}/moderators/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, ...invitePerms })
      });
      const result = await res.json();
      if (res.ok) {
        setInviteLink(window.location.origin + result.invite_link);
        setInviteEmail('');
        fetchData();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Gagal mengirim undangan');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Cabut akses moderator ini?')) return;
    try {
      await fetch(`/api/crowdsourcing/moderators/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Gagal mencabut akses');
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Link disalin!');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/mohonijin/crowdsourcing/${projectId}`}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-2">
            <ArrowLeft size={18} /> Kembali
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Kelola Moderator</h1>
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
              <UserPlus size={16} /> Invite Moderator
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div>
        ) : (
          <>
            {/* Active Moderators */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
              <h2 className="font-semibold mb-4">Moderator Aktif ({moderators.filter(m => m.status === 'active').length})</h2>
              {moderators.filter(m => m.status === 'active').length === 0 ? (
                <p className="text-zinc-500 text-sm">Belum ada moderator</p>
              ) : (
                <div className="space-y-3">
                  {moderators.filter(m => m.status === 'active').map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                      <div>
                        <p className="font-medium">{m.user_name || m.email}</p>
                        <p className="text-xs text-zinc-400">{m.email}</p>
                        <div className="flex gap-2 mt-1">
                          {m.can_approve && <span className="text-xs px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded">Approve</span>}
                          {m.can_reject && <span className="text-xs px-1.5 py-0.5 bg-red-600/20 text-red-400 rounded">Reject</span>}
                          {m.can_flag && <span className="text-xs px-1.5 py-0.5 bg-orange-600/20 text-orange-400 rounded">Flag</span>}
                          {m.can_export && <span className="text-xs px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded">Export</span>}
                        </div>
                      </div>
                      <button onClick={() => handleRevoke(m.id)}
                        className="p-2 text-red-400 hover:bg-red-600/20 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Invites */}
            {invites.length > 0 && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
                <h2 className="font-semibold mb-4">Undangan Pending ({invites.length})</h2>
                <div className="space-y-3">
                  {invites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                      <div>
                        <p className="flex items-center gap-2"><Mail size={14} /> {inv.email}</p>
                        <p className="text-xs text-zinc-500">
                          Expires: {new Date(inv.expires_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Invite Moderator</h2>
            
            {inviteLink ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Undangan berhasil dibuat! Bagikan link ini:</p>
                <div className="flex gap-2">
                  <input type="text" value={inviteLink} readOnly
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm" />
                  <button onClick={copyLink} className="px-3 py-2 bg-blue-600 rounded-lg">
                    <Copy size={16} />
                  </button>
                </div>
                <button onClick={() => { setShowInvite(false); setInviteLink(null); }}
                  className="w-full py-2 bg-zinc-700 rounded-lg">Tutup</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Email</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Permissions</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={invitePerms.can_approve}
                        onChange={e => setInvitePerms(p => ({ ...p, can_approve: e.target.checked }))} />
                      Approve
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={invitePerms.can_reject}
                        onChange={e => setInvitePerms(p => ({ ...p, can_reject: e.target.checked }))} />
                      Reject
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={invitePerms.can_flag}
                        onChange={e => setInvitePerms(p => ({ ...p, can_flag: e.target.checked }))} />
                      Flag
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={invitePerms.can_export}
                        onChange={e => setInvitePerms(p => ({ ...p, can_export: e.target.checked }))} />
                      Export
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowInvite(false)}
                    className="flex-1 py-2 bg-zinc-700 rounded-lg">Batal</button>
                  <button type="button" onClick={handleInvite} disabled={inviting || !inviteEmail}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2">
                    {inviting ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                    Kirim Undangan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
