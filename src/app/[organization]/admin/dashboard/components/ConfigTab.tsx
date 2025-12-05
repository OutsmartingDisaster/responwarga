'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Globe, Mail, Phone, MapPin, Clock, RefreshCw } from 'lucide-react';

interface OrgConfig {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  website: string | null;
  default_language: string | null;
  timezone: string | null;
  settings: any;
}

export default function ConfigTab({ organizationId }: { organizationId: string }) {
  const [config, setConfig] = useState<OrgConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    website: '',
    default_language: 'id',
    timezone: 'Asia/Jakarta',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/org/config');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setConfig(result.data);
      setForm({
        name: result.data.name || '',
        description: result.data.description || '',
        contact_email: result.data.contact_email || '',
        contact_phone: result.data.contact_phone || '',
        address: result.data.address || '',
        website: result.data.website || '',
        default_language: result.data.default_language || 'id',
        timezone: result.data.timezone || 'Asia/Jakarta',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/org/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setConfig(result.data);
      setSuccess('Configuration saved successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Organization Settings</h3>
            <p className="text-xs text-slate-400">Configure your organization profile</p>
          </div>
        </div>
        <button onClick={fetchConfig} disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Form */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-2">Organization Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-3 text-white" />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-2">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-3 text-white resize-none" />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
              <Mail className="w-3 h-3" /> Contact Email
            </label>
            <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-3 text-white" />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
              <Phone className="w-3 h-3" /> Contact Phone
            </label>
            <input type="text" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-3 text-white" />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Address
            </label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-3 text-white" />
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
              <Globe className="w-3 h-3" /> Website
            </label>
            <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://" className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-3 text-white" />
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Default Language</label>
            <select value={form.default_language} onChange={(e) => setForm({ ...form, default_language: e.target.value })}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-3 text-white">
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Timezone
            </label>
            <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-3 text-white">
              <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
              <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
              <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        {error && <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>}
        {success && <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">{success}</div>}

        {/* Save Button */}
        <div className="mt-6">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl">
            <Save className={`w-5 h-5 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Org Info Card */}
      {config && (
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-slate-500">
            Organization ID: <code className="font-mono text-slate-400">{config.id}</code>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Slug: <code className="font-mono text-slate-400">/{config.slug}</code>
          </p>
        </div>
      )}
    </div>
  );
}
