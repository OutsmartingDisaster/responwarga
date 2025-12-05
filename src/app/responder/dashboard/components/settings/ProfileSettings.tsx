'use client';

import React, { useState } from 'react';
import { User, Lock, Bell, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProfileSettingsProps {
  profile: any;
  onUpdate: (profile: any) => void;
}

type Section = 'profile' | 'security' | 'notifications';

export default function ProfileSettings({ profile, onUpdate }: ProfileSettingsProps) {
  const [activeSection, setActiveSection] = useState<Section>('profile');

  const sections = [
    { id: 'profile', label: 'Profil Saya', icon: User },
    { id: 'security', label: 'Keamanan', icon: Lock },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Pengaturan</h2>
        <p className="text-sm text-slate-400">Kelola profil dan preferensi akun Anda</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map(section => (
              <button key={section.id} onClick={() => setActiveSection(section.id as Section)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id 
                    ? 'bg-orange-600/20 text-orange-400' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}>
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-xl">
          {activeSection === 'profile' && <ProfileForm profile={profile} onUpdate={onUpdate} />}
          {activeSection === 'security' && <SecurityForm />}
          {activeSection === 'notifications' && <NotificationForm />}
        </div>
      </div>
    </div>
  );
}

function ProfileForm({ profile, onUpdate }: { profile: any; onUpdate: (p: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name || profile?.full_name || '',
    phone: profile?.phone || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onUpdate({ ...profile, ...form, full_name: form.name });
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
          <User className="w-5 h-5 text-orange-400" /> Profil Saya
        </h3>
        <p className="text-sm text-slate-400 mt-1">Kelola informasi pribadi Anda</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-white/5">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full flex items-center justify-center text-white text-lg font-bold">
            {(form.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium">{form.name || 'Nama belum diatur'}</p>
            <p className="text-sm text-slate-400">Responder</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nama Lengkap</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nomor Telepon</label>
          <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
        </div>

        <div className="pt-4">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white rounded-xl">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function SecurityForm() {
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
      toast.error('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-orange-400" /> Keamanan
        </h3>
        <p className="text-sm text-slate-400 mt-1">Ubah password akun Anda</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Password Saat Ini</label>
          <input type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Password Baru</label>
          <input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Konfirmasi Password</label>
          <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500" />
        </div>

        <div className="pt-4">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white rounded-xl">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengubah...</> : <><Lock className="w-4 h-4" /> Ubah Password</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function NotificationForm() {
  const [settings, setSettings] = useState({
    newAssignment: true,
    operationUpdates: true,
    sosAlerts: true
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Pengaturan diperbarui');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-400" /> Notifikasi
        </h3>
        <p className="text-sm text-slate-400 mt-1">Kelola preferensi notifikasi</p>
      </div>

      <div className="space-y-3">
        <ToggleItem label="Tugas Baru" description="Notifikasi saat ada tugas baru" 
          checked={settings.newAssignment} onChange={() => handleToggle('newAssignment')} />
        <ToggleItem label="Update Operasi" description="Notifikasi perubahan status operasi" 
          checked={settings.operationUpdates} onChange={() => handleToggle('operationUpdates')} />
        <ToggleItem label="Alert SOS" description="Notifikasi darurat dari tim" 
          checked={settings.sosAlerts} onChange={() => handleToggle('sosAlerts')} />
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
        className={`w-12 h-6 rounded-full transition-colors ${checked ? 'bg-orange-600' : 'bg-slate-600'}`}>
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
