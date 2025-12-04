'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Loader2, Check } from 'lucide-react';
import { TeamMemberRole } from '@/types/operations';

interface InviteMemberModalProps {
  operationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrgMember {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  phone?: string;
  status: string;
}

export default function InviteMemberModal({ operationId, onClose, onSuccess }: InviteMemberModalProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<TeamMemberRole>('responder');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'select', table: 'profiles', columns: 'id, user_id, full_name, role, phone, status' })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setMembers((result.data || []).filter((m: OrgMember) => m.role === 'org_responder'));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const filteredMembers = members.filter(m => !searchQuery || m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const toggleMember = (userId: string) => {
    const newSelected = new Set(selectedMembers);
    newSelected.has(userId) ? newSelected.delete(userId) : newSelected.add(userId);
    setSelectedMembers(newSelected);
  };

  const handleInvite = async () => {
    if (selectedMembers.size === 0) return setError('Pilih minimal satu anggota');
    setInviting(true);
    setError(null);
    try {
      for (const userId of selectedMembers) {
        const response = await fetch(`/api/operations/${operationId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, role: selectedRole })
        });
        const result = await response.json();
        if (!response.ok && !result.error?.includes('already invited')) throw new Error(result.error);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-800 border border-white/10 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" /> Undang Anggota Tim
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Role dalam operasi</label>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as TeamMemberRole)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500">
              <option value="responder">Responder</option>
              <option value="coordinator">Koordinator</option>
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Cari anggota..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">{searchQuery ? 'Tidak ada anggota yang cocok' : 'Tidak ada anggota tersedia'}</div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map(member => (
                <MemberItem key={member.user_id} member={member} selected={selectedMembers.has(member.user_id)} onToggle={() => toggleMember(member.user_id)} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <p className="text-sm text-slate-400">{selectedMembers.size} anggota dipilih</p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Batal</button>
            <button onClick={handleInvite} disabled={inviting || selectedMembers.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
              {inviting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Mengundang...</span></> : <><UserPlus className="w-4 h-4" /><span>Undang</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberItem({ member, selected, onToggle }: { member: OrgMember; selected: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${selected ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'}`}>
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selected ? 'bg-blue-600 border-blue-600' : 'border-slate-500'}`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1 text-left">
        <p className="text-white font-medium">{member.full_name}</p>
        {member.phone && <p className="text-sm text-slate-400">{member.phone}</p>}
      </div>
      <span className={`px-2 py-0.5 rounded text-xs ${member.status === 'active' || member.status === 'on_duty' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
        {member.status === 'on_duty' ? 'On Duty' : member.status}
      </span>
    </button>
  );
}
