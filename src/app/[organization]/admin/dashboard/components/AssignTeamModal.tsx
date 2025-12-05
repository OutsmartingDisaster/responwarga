'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AssignTeamModalProps {
  operationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrgMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  status?: string;
}

export default function AssignTeamModal({ operationId, onClose, onSuccess }: AssignTeamModalProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrgMembers();
  }, []);

  const fetchOrgMembers = async () => {
    try {
      const res = await fetch('/api/organization/members');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      // Filter only responders
      const responders = (result.data || []).filter((m: OrgMember) => 
        m.role === 'org_responder' || m.role === 'responder'
      );
      setMembers(responders);
    } catch (err: any) {
      toast.error('Gagal memuat anggota: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Pilih minimal satu anggota');
      return;
    }

    setInviting(true);
    try {
      // Invite each selected member
      for (const userId of selectedMembers) {
        const res = await fetch(`/api/operations/${operationId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, role: 'responder' })
        });
        if (!res.ok) {
          const result = await res.json();
          console.error('Failed to invite:', result.error);
        }
      }
      toast.success(`${selectedMembers.length} anggota ditambahkan ke tim`);
      onSuccess();
    } catch (err: any) {
      toast.error('Gagal menambahkan anggota: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-800 border border-white/10 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" /> Tambah Anggota Tim
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari anggota..."
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Members List */}
        <div className="p-4 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center py-8 text-slate-400">
              {search ? 'Tidak ada hasil' : 'Tidak ada responder tersedia'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map(m => (
                <button key={m.user_id} onClick={() => toggleMember(m.user_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    selectedMembers.includes(m.user_id) 
                      ? 'bg-blue-600/20 border border-blue-500/30' 
                      : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'
                  }`}>
                  <div className="w-9 h-9 bg-slate-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {(m.name || 'U').charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium">{m.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400 capitalize">{m.role}</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedMembers.includes(m.user_id) ? 'bg-blue-600 border-blue-600' : 'border-slate-500'
                  }`}>
                    {selectedMembers.includes(m.user_id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <span className="text-sm text-slate-400">{selectedMembers.length} dipilih</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Batal</button>
            <button onClick={handleInvite} disabled={inviting || selectedMembers.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
              {inviting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menambahkan...</> : 'Tambahkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
