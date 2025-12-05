'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, RefreshCw, Edit2, Trash2, Phone, MapPin, X, Loader2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  full_name?: string;
  role: string;
  status?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

export default function TeamTab({ organizationId, onRefresh }: { organizationId: string; onRefresh?: () => void }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [search, setSearch] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/organization/members');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setMembers(result.data || []);
    } catch (err: any) {
      toast.error('Gagal memuat anggota: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setShowEditModal(true);
  };

  const handleDelete = async (member: TeamMember) => {
    if (!confirm(`Hapus ${member.name || member.full_name} dari organisasi?`)) return;
    try {
      const res = await fetch(`/api/organization/members/${member.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }
      toast.success('Anggota dihapus');
      fetchMembers();
      onRefresh?.();
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const filteredMembers = members.filter(m => 
    (m.name || m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      org_admin: 'Admin',
      org_responder: 'Responder',
      responder: 'Responder',
      public: 'Publik'
    };
    return labels[role] || role;
  };

  const getStatusColor = (status?: string) => {
    if (status === 'on_duty') return 'bg-green-500/20 text-green-400';
    if (status === 'active') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Tim Responder
          </h3>
          <p className="text-sm text-slate-400 mt-1">Kelola anggota tim organisasi Anda</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchMembers} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
            <UserPlus className="w-4 h-4" /> Tambah Anggota
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari anggota..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
      </div>

      {/* Members List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <EmptyState onAdd={() => setShowAddModal(true)} />
      ) : (
        <div className="bg-slate-800/50 border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Telepon</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMembers.map(m => (
                <tr key={m.id} className="hover:bg-slate-900/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {(m.name || m.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-sm">{m.name || m.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{getRoleLabel(m.role)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(m.status)}`}>
                      {m.status === 'on_duty' ? 'On Duty' : m.status === 'active' ? 'Aktif' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{m.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(m)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {m.role !== 'org_admin' && (
                        <button onClick={() => handleDelete(m)} className="p-1.5 hover:bg-red-600/20 rounded text-slate-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddMemberModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchMembers(); onRefresh?.(); }} />
      )}

      {showEditModal && selectedMember && (
        <EditMemberModal member={selectedMember} onClose={() => { setShowEditModal(false); setSelectedMember(null); }} 
          onSuccess={() => { setShowEditModal(false); setSelectedMember(null); fetchMembers(); onRefresh?.(); }} />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-white/5">
      <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Belum ada anggota tim</h3>
      <p className="text-slate-400 mb-6">Tambahkan responder ke organisasi Anda</p>
      <button onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
        <UserPlus className="w-4 h-4" /> Tambah Anggota
      </button>
    </div>
  );
}

function AddMemberModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', phone: '', role: 'org_responder' });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.name) {
      setError('Email dan nama wajib diisi');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/organization/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success('Anggota berhasil ditambahkan');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-800 border border-white/10 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" /> Tambah Anggota Baru
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="responder@example.com"
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nama Lengkap *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nama lengkap"
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Telepon</label>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500">
              <option value="org_responder">Responder</option>
              <option value="org_admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Batal</button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Tambah Anggota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditMemberModal({ member, onClose, onSuccess }: { member: TeamMember; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    name: member.name || member.full_name || '', 
    phone: member.phone || '', 
    role: member.role 
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/organization/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success('Anggota berhasil diperbarui');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-800 border border-white/10 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-blue-400" /> Edit Anggota
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nama Lengkap</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Telepon</label>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500">
              <option value="org_responder">Responder</option>
              <option value="org_admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Batal</button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
