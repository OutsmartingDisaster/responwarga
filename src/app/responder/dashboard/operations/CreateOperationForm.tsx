'use client';

import React, { useState } from 'react';
import { MapPin, Building2, AlertTriangle, X, ChevronLeft, Save, Loader2 } from 'lucide-react';
import { DISASTER_TYPES, DisasterType, CreateOperationRequest } from '@/types/operations';
import dynamic from 'next/dynamic';

const MiniMapPicker = dynamic(() => import('./MiniMapPicker'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-slate-800/50 rounded-xl flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
  </div>
});

interface CreateOperationFormProps {
  onBack: () => void;
  onSuccess: (operationId: string) => void;
}

export default function CreateOperationForm({ onBack, onSuccess }: CreateOperationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', disasterType: 'flood' as DisasterType, description: '',
    disasterLocationName: '', disasterLat: null as number | null, disasterLng: null as number | null, disasterRadius: 10,
    poskoName: '', poskoAddress: '', poskoLat: null as number | null, poskoLng: null as number | null
  });

  const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Nama operasi harus diisi');
    if (!form.disasterLocationName.trim()) return setError('Nama lokasi bencana harus diisi');
    if (form.disasterLat === null || form.disasterLng === null) return setError('Pilih lokasi bencana pada peta');

    setLoading(true);
    setError(null);
    try {
      const payload: CreateOperationRequest = {
        name: form.name.trim(), disaster_type: form.disasterType,
        description: form.description.trim() || undefined,
        disaster_location_name: form.disasterLocationName.trim(),
        disaster_lat: form.disasterLat, disaster_lng: form.disasterLng, disaster_radius_km: form.disasterRadius,
        posko_name: form.poskoName.trim() || undefined, posko_address: form.poskoAddress.trim() || undefined,
        posko_lat: form.poskoLat || undefined, posko_lng: form.poskoLng || undefined
      };
      const response = await fetch('/api/operations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal membuat operasi');
      onSuccess(result.data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header onBack={onBack} />
      {error && <ErrorBanner error={error} onClose={() => setError(null)} />}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <Section title="Informasi Operasi" icon={<AlertTriangle className="w-5 h-5 text-orange-400" />}>
          <div className="grid gap-6 md:grid-cols-2">
            <Input label="Nama Operasi" required value={form.name} onChange={(v: string) => updateForm('name', v)} placeholder="Contoh: Respon Banjir Cipinang" className="md:col-span-2" />
            <Select label="Tipe Bencana" required value={form.disasterType} onChange={(v: string) => updateForm('disasterType', v)} options={Object.entries(DISASTER_TYPES).map(([k, v]) => ({ value: k, label: v }))} />
            <Input label="Radius Dampak (km)" type="number" value={form.disasterRadius} onChange={(v: string) => updateForm('disasterRadius', Number(v))} />
            <Textarea label="Deskripsi" value={form.description} onChange={(v: string) => updateForm('description', v)} placeholder="Deskripsi situasi bencana..." className="md:col-span-2" />
          </div>
        </Section>

        {/* Disaster Location */}
        <Section title="Lokasi Bencana" icon={<MapPin className="w-5 h-5 text-red-400" />}>
          <Input label="Nama Lokasi" required value={form.disasterLocationName} onChange={(v: string) => updateForm('disasterLocationName', v)} placeholder="Contoh: Kelurahan Cipinang Melayu" />
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Titik Pusat Bencana <span className="text-red-400">*</span></label>
            <MiniMapPicker latitude={form.disasterLat} longitude={form.disasterLng} radius={form.disasterRadius}
              onLocationChange={(lat: number, lng: number) => { updateForm('disasterLat', lat); updateForm('disasterLng', lng); }} markerColor="red" />
            {form.disasterLat && form.disasterLng && <p className="text-sm text-slate-400 mt-2">Koordinat: {form.disasterLat.toFixed(6)}, {form.disasterLng.toFixed(6)}</p>}
          </div>
        </Section>

        {/* Posko Location */}
        <Section title="Lokasi Posko" icon={<Building2 className="w-5 h-5 text-blue-400" />} optional>
          <div className="grid gap-6 md:grid-cols-2">
            <Input label="Nama Posko" value={form.poskoName} onChange={(v: string) => updateForm('poskoName', v)} placeholder="Contoh: Posko Utama GOR" />
            <Input label="Alamat Posko" value={form.poskoAddress} onChange={(v: string) => updateForm('poskoAddress', v)} placeholder="Contoh: Jl. Raya Cipinang No. 10" />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Lokasi Posko</label>
            <MiniMapPicker latitude={form.poskoLat} longitude={form.poskoLng}
              onLocationChange={(lat: number, lng: number) => { updateForm('poskoLat', lat); updateForm('poskoLng', lng); }} markerColor="blue" />
          </div>
        </Section>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <button type="button" onClick={onBack} className="px-6 py-3 text-slate-400 hover:text-white">Batal</button>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Menyimpan...</span></> : <><Save className="w-5 h-5" /><span>Aktivasi Respon</span></>}
          </button>
        </div>
      </form>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center gap-4">
      <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
      <div><h2 className="text-2xl font-bold text-white">Aktivasi Respon Baru</h2><p className="text-slate-400 mt-1">Buat operasi respon bencana baru</p></div>
    </div>
  );
}

function ErrorBanner({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 flex-shrink-0" /><span>{error}</span>
      <button onClick={onClose} className="ml-auto"><X className="w-4 h-4" /></button>
    </div>
  );
}

function Section({ title, icon, optional, children }: { title: string; icon: React.ReactNode; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        {icon} {title} {optional && <span className="text-sm font-normal text-slate-500">(opsional)</span>}
      </h3>
      {children}
    </div>
  );
}

function Input({ label, required, value, onChange, placeholder, type = 'text', className = '' }: any) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label} {required && <span className="text-red-400">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
    </div>
  );
}

function Select({ label, required, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label} {required && <span className="text-red-400">*</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500">
        {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, className = '' }: any) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
    </div>
  );
}
