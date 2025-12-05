'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, Radio, Users, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CreateOperationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface OrgMember {
  id: string;
  user_id: string;
  name: string;
  full_name?: string;
  role: string;
}

const DISASTER_TYPES = [
  { value: 'flood', label: 'Banjir' },
  { value: 'earthquake', label: 'Gempa Bumi' },
  { value: 'fire', label: 'Kebakaran' },
  { value: 'landslide', label: 'Tanah Longsor' },
  { value: 'tsunami', label: 'Tsunami' },
  { value: 'volcano', label: 'Gunung Berapi' },
  { value: 'storm', label: 'Badai' },
  { value: 'other', label: 'Lainnya' }
];

export default function CreateOperationModal({ onClose, onSuccess }: CreateOperationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    disaster_type: 'flood',
    description: '',
    disaster_location_name: '',
    disaster_lat: '',
    disaster_lng: '',
    disaster_radius_km: '10',
    posko_name: '',
    posko_address: ''
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/organization/members');
      const result = await res.json();
      if (res.ok) {
        const responders = (result.data || []).filter((m: OrgMember) => 
          m.role === 'org_responder' || m.role === 'responder'
        );
        setMembers(responders);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.disaster_location_name || !form.disaster_lat || !form.disaster_lng) {
      setError('Lengkapi semua field wajib');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create operation
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          disaster_lat: parseFloat(form.disaster_lat),
          disaster_lng: parseFloat(form.disaster_lng),
          disaster_radius_km: parseFloat(form.disaster_radius_km) || 10
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Add selected team members
      if (selectedMembers.length > 0) {
        const operationId = result.data.id;
        for (const userId of selectedMembers) {
          await fetch(`/api/operations/${operationId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, role: 'responder' })
          });
        }
        toast.success(`Operasi dibuat dengan ${selectedMembers.length} anggota tim`);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm(f => ({
            ...f,
            disaster_lat: pos.coords.latitude.toFixed(6),
            disaster_lng: pos.coords.longitude.toFixed(6)
          }));
        },
        () => setError('Gagal mendapatkan lokasi')
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-800 border border-white/10 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-slate-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" /> Buat Operasi Baru
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nama Operasi *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Respon Banjir Jakarta Timur"
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Jenis Bencana *</label>
            <select value={form.disaster_type} onChange={e => setForm({ ...form, disaster_type: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500">
              {DISASTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Deskripsi</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Deskripsi singkat operasi..."
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" rows={2} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Lokasi Bencana *</label>
            <input type="text" value={form.disaster_location_name} onChange={e => setForm({ ...form, disaster_location_name: e.target.value })}
              placeholder="Contoh: Kelurahan Cipinang Melayu"
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Latitude *</label>
              <input type="text" value={form.disaster_lat} onChange={e => setForm({ ...form, disaster_lat: e.target.value })}
                placeholder="-6.2088"
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Longitude *</label>
              <input type="text" value={form.disaster_lng} onChange={e => setForm({ ...form, disaster_lng: e.target.value })}
                placeholder="106.8456"
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <button type="button" onClick={handleGetLocation}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
            <MapPin className="w-4 h-4" /> Gunakan lokasi saat ini
          </button>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Radius Operasi (km)</label>
            <input type="number" value={form.disaster_radius_km} onChange={e => setForm({ ...form, disaster_radius_km: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div className="pt-4 border-t border-white/10">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Posko (Opsional)</h4>
            <div className="space-y-3">
              <input type="text" value={form.posko_name} onChange={e => setForm({ ...form, posko_name: e.target.value })}
                placeholder="Nama Posko"
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              <input type="text" value={form.posko_address} onChange={e => setForm({ ...form, posko_address: e.target.value })}
                placeholder="Alamat Posko"
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* Team Selection */}
          <div className="pt-4 border-t border-white/10">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Pilih Tim Responder
              {selectedMembers.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">{selectedMembers.length} dipilih</span>
              )}
            </h4>
            {members.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada responder tersedia. Tambahkan anggota di tab Tim Responder.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {members.map(m => (
                  <button key={m.user_id} type="button" onClick={() => toggleMember(m.user_id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      selectedMembers.includes(m.user_id) 
                        ? 'bg-blue-600/20 border border-blue-500/30' 
                        : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'
                    }`}>
                    <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {(m.name || m.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-left text-sm text-white">{m.name || m.full_name || 'Unknown'}</span>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedMembers.includes(m.user_id) ? 'bg-blue-600 border-blue-600' : 'border-slate-500'
                    }`}>
                      {selectedMembers.includes(m.user_id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Batal</button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat...</> : 'Buat Operasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
