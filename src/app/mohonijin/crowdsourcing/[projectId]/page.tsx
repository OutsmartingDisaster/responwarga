'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Users, FileText, Download, BarChart3 } from 'lucide-react';
import LocationPickerLeaflet from '@/components/crowdsourcing/LocationPickerLeaflet';
import FormBuilder, { FormField } from '@/components/crowdsourcing/FormBuilder';
import MultiZoneEditor, { GeofenceZone } from '@/components/crowdsourcing/MultiZoneEditor';
import type { CrowdsourceProject } from '@/lib/crowdsourcing/types';

const disasterTypes = [
  { value: 'flood', label: 'Banjir' }, { value: 'earthquake', label: 'Gempa Bumi' },
  { value: 'fire', label: 'Kebakaran' }, { value: 'landslide', label: 'Tanah Longsor' },
  { value: 'tsunami', label: 'Tsunami' }, { value: 'volcano', label: 'Gunung Berapi' },
  { value: 'storm', label: 'Badai' }, { value: 'other', label: 'Lainnya' }
];

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CrowdsourceProject & { use_multi_zone?: boolean }>>({});
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [zones, setZones] = useState<GeofenceZone[]>([]);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const [projRes, fieldsRes, zonesRes] = await Promise.all([
        fetch(`/api/crowdsourcing/projects/${projectId}`),
        fetch(`/api/crowdsourcing/projects/${projectId}/fields`),
        fetch(`/api/crowdsourcing/projects/${projectId}/zones`)
      ]);
      const { data } = await projRes.json();
      const { data: fields } = await fieldsRes.json();
      const { data: zonesData } = await zonesRes.json();
      if (!data) { router.push('/mohonijin/crowdsourcing'); return; }
      setForm(data);
      setFormFields(fields || []);
      setZones(zonesData || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: FormField) => {
    if (field.id && !field.id.startsWith('temp-')) {
      await fetch(`/api/crowdsourcing/fields/${field.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field)
      });
    } else {
      const res = await fetch(`/api/crowdsourcing/projects/${projectId}/fields`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field)
      });
      const { data } = await res.json();
      setFormFields(prev => prev.map(f => f.id === field.id ? data : f));
    }
    fetchProject();
  };

  const handleDeleteField = async (fieldId: string) => {
    await fetch(`/api/crowdsourcing/fields/${fieldId}`, { method: 'DELETE' });
    setFormFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const handleSaveZone = async (zone: GeofenceZone) => {
    if (zone.id && !zone.id.startsWith('temp-')) {
      await fetch(`/api/crowdsourcing/zones/${zone.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zone)
      });
    } else {
      await fetch(`/api/crowdsourcing/projects/${projectId}/zones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zone)
      });
    }
    fetchProject();
  };

  const handleDeleteZone = async (zoneId: string) => {
    await fetch(`/api/crowdsourcing/zones/${zoneId}`, { method: 'DELETE' });
    setZones(prev => prev.filter(z => z.id !== zoneId));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleLocationChange = (loc: { lat: number; lng: number }, address: string) => {
    setForm(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lng, location_name: address }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/crowdsourcing/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      router.push('/mohonijin/crowdsourcing');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/mohonijin/crowdsourcing" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-2">
            <ArrowLeft size={18} /> Kembali
          </Link>
          <h1 className="text-xl font-bold">Edit Project</h1>
          <div className="flex flex-wrap gap-3 mt-3">
            <Link href={`/mohonijin/crowdsourcing/${projectId}/submissions`}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
              <FileText size={14} /> Submissions
            </Link>
            <Link href={`/mohonijin/crowdsourcing/${projectId}/moderators`}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
              <Users size={14} /> Moderators
            </Link>
            <Link href={`/mohonijin/crowdsourcing/${projectId}/analytics`}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
              <BarChart3 size={14} /> Analytics
            </Link>
            <a href={`/api/crowdsourcing/export/${projectId}?format=csv`}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm">
              <Download size={14} /> Export CSV
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold">Informasi Dasar</h2>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Judul Project *</label>
              <input type="text" name="title" value={form.title || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Deskripsi</label>
              <textarea name="description" value={form.description || ''} onChange={handleChange} rows={3}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tipe Bencana</label>
                <select name="disaster_type" value={form.disaster_type || ''} onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                  {disasterTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Status</label>
                <select name="status" value={form.status || ''} onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <option value="draft">Draft</option>
                  <option value="active">Aktif</option>
                  <option value="closed">Ditutup</option>
                  <option value="archived">Arsip</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Lokasi & Geofence</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.use_multi_zone || zones.length > 0}
                  onChange={e => setForm(p => ({ ...p, use_multi_zone: e.target.checked }))} />
                Multi-Daerah
              </label>
            </div>
            
            {(form.use_multi_zone || zones.length > 0) ? (
              <MultiZoneEditor zones={zones} onChange={setZones} onSave={handleSaveZone} onDelete={handleDeleteZone} />
            ) : (
              <>
                <LocationPickerLeaflet
                  value={form.latitude && form.longitude ? { lat: form.latitude, lng: form.longitude } : null}
                  onChange={handleLocationChange}
                  showGeofenceLevel={true}
                  geofenceLevel={form.geofence_level || 'radius'}
                  onGeofenceLevelChange={(level) => setForm(p => ({ ...p, geofence_level: level as any }))}
                />
                {(form.geofence_level || 'radius') === 'radius' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Radius Geofence (km)</label>
                    <input type="number" name="geofence_radius_km" value={form.geofence_radius_km || 5} onChange={handleChange}
                      min="1" max="100" step="0.5"
                      className="w-32 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Form Builder */}
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5">
            <FormBuilder 
              fields={formFields} 
              onChange={setFormFields}
              onSave={handleSaveField}
              onDelete={handleDeleteField}
            />
          </div>

          {/* Settings */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold">Pengaturan</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.allow_photo ?? true}
                  onChange={e => setForm(p => ({ ...p, allow_photo: e.target.checked }))} />
                <span className="text-sm">Izinkan Foto</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.allow_video ?? true}
                  onChange={e => setForm(p => ({ ...p, allow_video: e.target.checked }))} />
                <span className="text-sm">Izinkan Video</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.require_location ?? true}
                  onChange={e => setForm(p => ({ ...p, require_location: e.target.checked }))} />
                <span className="text-sm">Wajib Lokasi</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.auto_approve ?? false}
                  onChange={e => setForm(p => ({ ...p, auto_approve: e.target.checked }))} />
                <span className="text-sm">Auto Approve</span>
              </label>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Max File Size (MB)</label>
              <input type="number" name="max_file_size_mb" value={form.max_file_size_mb || 10} onChange={handleChange}
                min="1" max="50" className="w-32 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </main>
    </div>
  );
}
