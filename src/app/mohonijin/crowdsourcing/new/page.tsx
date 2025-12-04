'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, FileText } from 'lucide-react';
import LocationPickerLeaflet from '@/components/crowdsourcing/LocationPickerLeaflet';
import FormBuilder, { FormField } from '@/components/crowdsourcing/FormBuilder';
import MultiZoneEditor, { GeofenceZone } from '@/components/crowdsourcing/MultiZoneEditor';

interface ProjectForm {
  title: string; description: string; disaster_type: string; status: string;
  location_name: string; latitude: number; longitude: number; geofence_radius_km: number;
  geofence_level: string; geofence_area_name: string;
  allow_photo: boolean; allow_video: boolean; max_file_size_mb: number;
  require_location: boolean; auto_approve: boolean; start_date: string | null; end_date: string | null;
}

const disasterTypes = [
  { value: 'flood', label: 'Banjir' },
  { value: 'earthquake', label: 'Gempa Bumi' },
  { value: 'fire', label: 'Kebakaran' },
  { value: 'landslide', label: 'Tanah Longsor' },
  { value: 'tsunami', label: 'Tsunami' },
  { value: 'volcano', label: 'Gunung Berapi' },
  { value: 'storm', label: 'Badai' },
  { value: 'other', label: 'Lainnya' }
];

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DRAFT_KEY = 'crowdsource_project_draft';

  const getInitialForm = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...parsed.form };
        } catch {}
      }
    }
    return {
      title: '', description: '', disaster_type: 'flood', status: 'draft',
      location_name: '', latitude: 0, longitude: 0, geofence_radius_km: 5,
      geofence_level: 'radius', geofence_area_name: '',
      allow_photo: true, allow_video: true, max_file_size_mb: 10,
      require_location: true, auto_approve: false, start_date: null, end_date: null
    };
  };

  const [form, setForm] = useState<ProjectForm>(getInitialForm);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [useMultiZone, setUseMultiZone] = useState(false);
  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [hasDraft, setHasDraft] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormFields(parsed.formFields || []);
        setUseMultiZone(parsed.useMultiZone || false);
        setZones(parsed.zones || []);
        setHasDraft(true);
      } catch {}
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const draft = { form, formFields, useMultiZone, zones };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [form, formFields, useMultiZone, zones]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setForm({
      title: '', description: '', disaster_type: 'flood', status: 'draft',
      location_name: '', latitude: 0, longitude: 0, geofence_radius_km: 5,
      geofence_level: 'radius', geofence_area_name: '',
      allow_photo: true, allow_video: true, max_file_size_mb: 10,
      require_location: true, auto_approve: false, start_date: null, end_date: null
    });
    setFormFields([]);
    setUseMultiZone(false);
    setZones([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? (parseFloat(value) || 0) : 
              (value === '' && (name === 'start_date' || name === 'end_date')) ? null : value
    }));
  };

  const handleLocationChange = (loc: { lat: number; lng: number }, address: string) => {
    setForm(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lng, location_name: address }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Judul wajib diisi'); return; }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/crowdsourcing/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          start_date: form.start_date || null,
          end_date: form.end_date || null
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      // Save form fields if any
      if (formFields.length > 0) {
        for (const field of formFields) {
          await fetch(`/api/crowdsourcing/projects/${result.data.id}/fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(field)
          });
        }
      }
      
      // Save zones if multi-zone
      if (useMultiZone && zones.length > 0) {
        for (const zone of zones) {
          await fetch(`/api/crowdsourcing/projects/${result.data.id}/zones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(zone)
          });
        }
      }
      
      localStorage.removeItem(DRAFT_KEY);
      router.push('/mohonijin/crowdsourcing');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/mohonijin/crowdsourcing" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-2">
            <ArrowLeft size={18} /> Kembali
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Buat Project Baru</h1>
            {hasDraft && (
              <button type="button" onClick={clearDraft}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg">
                <FileText size={14} /> Hapus Draft
              </button>
            )}
          </div>
          {hasDraft && (
            <p className="text-xs text-green-400 mt-1">✓ Draft tersimpan otomatis</p>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold">Informasi Dasar</h2>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Judul Project *</label>
              <input type="text" name="title" value={form.title} onChange={handleChange}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Deskripsi</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tipe Bencana</label>
                <select name="disaster_type" value={form.disaster_type} onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                  {disasterTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Status</label>
                <select name="status" value={form.status} onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <option value="draft">Draft</option>
                  <option value="active">Aktif</option>
                  <option value="closed">Ditutup</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Lokasi & Geofence</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useMultiZone} onChange={e => setUseMultiZone(e.target.checked)} />
                Multi-Daerah
              </label>
            </div>
            
            {useMultiZone ? (
              <MultiZoneEditor zones={zones} onChange={setZones} />
            ) : (
              <>
                <LocationPickerLeaflet 
                  value={form.latitude && form.longitude ? { lat: form.latitude, lng: form.longitude } : null}
                  onChange={handleLocationChange}
                  showGeofenceLevel={true}
                  geofenceLevel={form.geofence_level}
                  onGeofenceLevelChange={(level) => setForm(p => ({ ...p, geofence_level: level }))}
                />
                {form.geofence_level === 'radius' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Radius Geofence (km)</label>
                    <input type="number" name="geofence_radius_km" value={form.geofence_radius_km} onChange={handleChange}
                      min="1" max="100" step="0.5"
                      className="w-32 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Form Builder */}
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5">
            <FormBuilder fields={formFields} onChange={setFormFields} />
          </div>

          {/* Settings */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold">Pengaturan</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="allow_photo" checked={form.allow_photo}
                  onChange={e => setForm(p => ({ ...p, allow_photo: e.target.checked }))} />
                <span className="text-sm">Izinkan Foto</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="allow_video" checked={form.allow_video}
                  onChange={e => setForm(p => ({ ...p, allow_video: e.target.checked }))} />
                <span className="text-sm">Izinkan Video</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="require_location" checked={form.require_location}
                  onChange={e => setForm(p => ({ ...p, require_location: e.target.checked }))} />
                <span className="text-sm">Wajib Lokasi</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="auto_approve" checked={form.auto_approve}
                  onChange={e => setForm(p => ({ ...p, auto_approve: e.target.checked }))} />
                <span className="text-sm">Auto Approve</span>
              </label>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Max File Size (MB)</label>
              <input type="number" name="max_file_size_mb" value={form.max_file_size_mb} onChange={handleChange}
                min="1" max="50" className="w-32 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Menyimpan...' : 'Simpan Project'}
          </button>
        </form>
      </main>
    </div>
  );
}
