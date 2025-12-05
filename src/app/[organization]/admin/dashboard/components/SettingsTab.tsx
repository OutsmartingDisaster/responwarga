'use client';

import React, { useState } from 'react';
import { Settings, User, Building2, Shield, Bell, Lock, Save, Loader2, Upload, X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SettingsTabProps {
  profile: any;
  organization: any;
  onProfileUpdate: (profile: any) => void;
  onOrganizationUpdate: (org: any) => void;
}

type SettingsSection = 'profile' | 'organization' | 'security' | 'notifications';

export default function SettingsTab({ profile, organization, onProfileUpdate, onOrganizationUpdate }: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  const sections = [
    { id: 'profile', label: 'Profil Saya', icon: User },
    { id: 'organization', label: 'Organisasi', icon: Building2 },
    { id: 'security', label: 'Keamanan', icon: Lock },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
  ];

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0">
        <nav className="space-y-1">
          {sections.map(section => (
            <button key={section.id} onClick={() => setActiveSection(section.id as SettingsSection)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id 
                  ? 'bg-blue-600/20 text-blue-400' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl">
        {activeSection === 'profile' && (
          <ProfileSettings profile={profile} onUpdate={onProfileUpdate} />
        )}
        {activeSection === 'organization' && (
          <OrganizationSettings organization={organization} onUpdate={onOrganizationUpdate} />
        )}
        {activeSection === 'security' && <SecuritySettings />}
        {activeSection === 'notifications' && <NotificationSettings />}
      </div>
    </div>
  );
}

function ProfileSettings({ profile, onUpdate }: { profile: any; onUpdate: (p: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name || profile?.full_name || '',
    phone: profile?.phone || '',
    email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, phone: form.phone })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onUpdate({ ...profile, name: form.name, full_name: form.name, phone: form.phone });
      toast.success('Profil berhasil diperbarui');
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" /> Profil Saya
        </h3>
        <p className="text-sm text-slate-400 mt-1">Kelola informasi pribadi Anda</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-white/5">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {(form.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium">{form.name || 'Nama belum diatur'}</p>
            <p className="text-sm text-slate-400">{profile?.role === 'org_admin' ? 'Admin Organisasi' : 'Responder'}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nama Lengkap</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nomor Telepon</label>
          <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
        </div>

        <div className="pt-4">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function OrganizationSettings({ organization, onUpdate }: { organization: any; onUpdate: (o: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: organization?.name || '',
    description: organization?.description || organization?.short_description || '',
    contact_email: organization?.contact_email || organization?.email || '',
    contact_phone: organization?.contact_phone || organization?.phone || '',
    address: organization?.address || '',
    website: organization?.website || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onUpdate({ ...organization, ...form });
      toast.success('Organisasi berhasil diperbarui');
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    try {
      const res = await fetch('/api/settings/organization/logo', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onUpdate({ ...organization, logo_url: result.data.logo_url });
      toast.success('Logo berhasil diupload');
    } catch (err: any) {
      toast.error('Gagal upload logo: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-400" /> Pengaturan Organisasi
        </h3>
        <p className="text-sm text-slate-400 mt-1">Kelola informasi dan profil organisasi</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo */}
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-white/5">
          <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-slate-500" />
            )}
          </div>
          <div>
            <p className="text-white font-medium mb-2">Logo Organisasi</p>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
              <Upload className="w-4 h-4" /> Upload Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nama Organisasi</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Deskripsi</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Kontak</label>
            <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Telepon Kontak</label>
            <input type="text" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Alamat</label>
          <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Website</label>
          <input type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
            placeholder="https://"
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
        </div>

        <div className="pt-4">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function SecuritySettings() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Password baru tidak cocok');
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success('Password berhasil diubah');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error('Gagal mengubah password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-400" /> Keamanan
        </h3>
        <p className="text-sm text-slate-400 mt-1">Kelola password dan keamanan akun</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Password Saat Ini</label>
          <input type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Password Baru</label>
          <input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Konfirmasi Password Baru</label>
          <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" />
        </div>

        <div className="pt-4">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengubah...</> : <><Lock className="w-4 h-4" /> Ubah Password</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newAssignment: true,
    operationUpdates: true,
    teamChanges: true
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Pengaturan notifikasi diperbarui');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-400" /> Notifikasi
        </h3>
        <p className="text-sm text-slate-400 mt-1">Kelola preferensi notifikasi</p>
      </div>

      <div className="space-y-3">
        <ToggleItem label="Notifikasi Email" description="Terima notifikasi via email" 
          checked={settings.emailNotifications} onChange={() => handleToggle('emailNotifications')} />
        <ToggleItem label="Push Notifications" description="Terima notifikasi di browser" 
          checked={settings.pushNotifications} onChange={() => handleToggle('pushNotifications')} />
        <ToggleItem label="Tugas Baru" description="Notifikasi saat ada tugas baru" 
          checked={settings.newAssignment} onChange={() => handleToggle('newAssignment')} />
        <ToggleItem label="Update Operasi" description="Notifikasi perubahan status operasi" 
          checked={settings.operationUpdates} onChange={() => handleToggle('operationUpdates')} />
        <ToggleItem label="Perubahan Tim" description="Notifikasi saat ada anggota baru/keluar" 
          checked={settings.teamChanges} onChange={() => handleToggle('teamChanges')} />
      </div>
    </div>
  );
}

function ToggleItem({ label, description, checked, onChange }: { 
  label: string; description: string; checked: boolean; onChange: () => void 
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
      <div>
        <p className="text-white font-medium">{label}</p>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <button onClick={onChange}
        className={`w-12 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-600'}`}>
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
