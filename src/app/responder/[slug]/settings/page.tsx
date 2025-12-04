'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Upload, Save, Building2 } from 'lucide-react';

export default function OrganizationSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/organization/settings');
      if (!res.ok) throw new Error('Failed to fetch');
      const { data } = await res.json();
      setOrganization(data);
      setLogoPreview(data.logo_url);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = organization?.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('type', 'logo');

        const uploadRes = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Logo upload failed');
        const { url } = await uploadRes.json();
        logoUrl = url;
      }

      // Update settings
      const res = await fetch('/api/organization/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: logoUrl }),
      });

      if (!res.ok) throw new Error('Failed to save');
      
      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Organization Settings</h1>
        </div>

        <div className="bg-zinc-800 rounded-lg p-6 space-y-6">
          {/* Logo Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Organization Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-16 h-16 text-zinc-500" />
                )}
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                  <Upload className="w-4 h-4" />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-zinc-400 mt-2">PNG or JPG, max 2MB</p>
              </div>
            </div>
          </div>

          {/* Organization Info */}
          <div>
            <label className="block text-sm font-medium mb-2">Organization Name</label>
            <input
              type="text"
              value={organization?.name || ''}
              disabled
              className="w-full px-4 py-2 bg-zinc-700 rounded-lg text-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug</label>
            <input
              type="text"
              value={organization?.slug || ''}
              disabled
              className="w-full px-4 py-2 bg-zinc-700 rounded-lg text-zinc-400"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
