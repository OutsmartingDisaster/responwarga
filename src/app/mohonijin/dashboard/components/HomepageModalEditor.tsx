'use client';

import { useState, useEffect } from 'react';

interface ModalSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  content: string;
  cta_text: string;
  cta_url: string;
  public_note: string;
}

const defaultSettings: ModalSettings = {
  enabled: true,
  title: 'Fitur Respon Warga masih tahap uji coba',
  subtitle: 'Pengumuman Publik',
  content: '',
  cta_text: 'Buka Inisiatif Banjir Sumatra',
  cta_url: '',
  public_note: ''
};

export default function HomepageModalEditor() {
  const [settings, setSettings] = useState<ModalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/homepage_modal');
      if (res.ok) {
        const { data } = await res.json();
        setSettings({ ...defaultSettings, ...data });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/homepage_modal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
      } else {
        const { error } = await res.json();
        setMessage({ type: 'error', text: error || 'Gagal menyimpan pengaturan' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Pengaturan Modal Homepage</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Kelola pengumuman yang tampil di halaman utama
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/50 border border-green-700 text-green-300' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-zinc-800 rounded-lg p-6 space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-zinc-700/50 rounded-lg">
          <div>
            <h3 className="font-medium text-white">Aktifkan Modal</h3>
            <p className="text-sm text-zinc-400">Tampilkan pengumuman di halaman utama</p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enabled ? 'bg-blue-600' : 'bg-zinc-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Subtitle */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Label Atas (Subtitle)
          </label>
          <input
            type="text"
            value={settings.subtitle}
            onChange={e => setSettings(s => ({ ...s, subtitle: e.target.value }))}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Pengumuman Publik"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Judul
          </label>
          <input
            type="text"
            value={settings.title}
            onChange={e => setSettings(s => ({ ...s, title: e.target.value }))}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Fitur Respon Warga masih tahap uji coba"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Isi Pengumuman
          </label>
          <textarea
            value={settings.content}
            onChange={e => setSettings(s => ({ ...s, content: e.target.value }))}
            rows={6}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tulis isi pengumuman di sini..."
          />
          <p className="text-xs text-zinc-500 mt-1">Gunakan baris baru untuk paragraf terpisah</p>
        </div>

        {/* Public Note */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Catatan untuk Publik
          </label>
          <input
            type="text"
            value={settings.public_note}
            onChange={e => setSettings(s => ({ ...s, public_note: e.target.value }))}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Kalau kamu ingin berkontribusi..."
          />
          <p className="text-xs text-zinc-500 mt-1">Tampil hanya untuk pengguna non-admin</p>
        </div>

        {/* CTA Button */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Teks Tombol CTA
            </label>
            <input
              type="text"
              value={settings.cta_text}
              onChange={e => setSettings(s => ({ ...s, cta_text: e.target.value }))}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Buka Inisiatif Banjir Sumatra"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              URL Tombol CTA
            </label>
            <input
              type="url"
              value={settings.cta_url}
              onChange={e => setSettings(s => ({ ...s, cta_url: e.target.value }))}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Preview */}
        <div className="border-t border-zinc-700 pt-6">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Preview</h3>
          <div className="bg-white/95 rounded-2xl p-6 max-w-lg">
            <p className="uppercase text-xs tracking-widest text-red-500 font-semibold">
              {settings.subtitle}
            </p>
            <h2 className="mt-2 text-xl font-bold text-zinc-900">
              {settings.title}
            </h2>
            <p className="mt-4 text-zinc-700 text-sm whitespace-pre-line">
              {settings.content}
            </p>
            {settings.public_note && (
              <p className="mt-3 text-xs text-zinc-500">
                {settings.public_note}
              </p>
            )}
            {settings.cta_text && (
              <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-white text-sm font-medium">
                {settings.cta_text}
                <span>↗</span>
              </button>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-zinc-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>
    </div>
  );
}
