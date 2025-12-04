'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';
import { logoutUser } from '@/lib/auth/api';
import {
  Users, Activity, Shield, Settings, ChevronRight, ChevronDown,
  Clock, MapPin, Radio, CheckCircle2, AlertTriangle, LogOut,
  Building2, FileText, UserCheck, Send, X
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

interface Profile {
  id: string; name: string; role: string; status: string;
  latitude?: number; longitude?: number; phone?: string;
}
interface DisasterResponse {
  id: string; name: string; status: string; urgency?: string;
  location?: string; latitude?: number; longitude?: number; created_at: string;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition
    ${active ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
    ${collapsed ? 'justify-center' : ''}`}>
    <Icon size={20} />
    {!collapsed && <span className="flex-1 text-left text-sm font-medium">{label}</span>}
    {!collapsed && badge && <span className="px-2 py-0.5 text-xs bg-blue-600 rounded-full">{badge}</span>}
  </button>
);

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  </div>
);

export default function OrgAdminDashboard({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const api = useMemo(() => createApiClient(), []);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [organization, setOrganization] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [activeResponses, setActiveResponses] = useState<DisasterResponse[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, operations: 0, completed: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await api.auth.getUser();
      if (!user) { router.push('/masuk'); return; }

      const { data: profileData } = await api.from('profiles').select('*').eq('user_id', user.id).single();
      if (!profileData?.organization_id) { router.push('/masuk'); return; }
      setProfile(profileData);

      const { data: orgData } = await api.from('organizations').select('*').eq('id', profileData.organization_id).single();
      setOrganization(orgData);

      const { data: membersData } = await api.from('profiles').select('*')
        .eq('organization_id', profileData.organization_id).order('name');
      setMembers(membersData || []);

      const { data: responses } = await api.from('disaster_responses').select('*')
        .eq('organization_id', profileData.organization_id).eq('status', 'active').order('created_at', { ascending: false });
      setActiveResponses(responses || []);

      const { data: completed } = await api.from('disaster_responses').select('id')
        .eq('organization_id', profileData.organization_id).eq('status', 'finished');

      const activeCount = (membersData || []).filter((m: Profile) => m.status === 'on_duty' || m.status === 'active').length;
      setStats({
        total: membersData?.length || 0,
        active: activeCount,
        operations: responses?.length || 0,
        completed: completed?.length || 0
      });
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push('/masuk');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-300 overflow-hidden">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className={`relative flex flex-col h-full border-r border-white/5 transition-all duration-300 z-50
        ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-[#0f172a]`}>
        <div className="flex items-center gap-3 p-5 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600 shadow-lg overflow-hidden">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Shield className="text-white" size={22} />
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-white text-sm truncate">{organization?.name || 'Organization'}</h1>
              <span className="text-xs text-blue-400">Admin Panel</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <SidebarItem icon={Activity} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} collapsed={sidebarCollapsed} />
          <SidebarItem icon={Radio} label="Operasi Aktif" active={activeTab === 'operations'} onClick={() => setActiveTab('operations')} collapsed={sidebarCollapsed} badge={stats.operations || null} />
          <SidebarItem icon={Users} label="Tim Responder" active={activeTab === 'team'} onClick={() => setActiveTab('team')} collapsed={sidebarCollapsed} badge={stats.active || null} />
          <SidebarItem icon={FileText} label="Laporan" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} collapsed={sidebarCollapsed} />
          <SidebarItem icon={Settings} label="Pengaturan" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} collapsed={sidebarCollapsed} />
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center w-full p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg">
            {sidebarCollapsed ? <ChevronRight size={20} /> : <span className="text-xs uppercase tracking-widest">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'operations' && 'Operasi Aktif'}
              {activeTab === 'team' && 'Tim Responder'}
              {activeTab === 'reports' && 'Laporan'}
              {activeTab === 'settings' && 'Pengaturan Organisasi'}
            </h2>
            <p className="text-sm text-slate-400">{organization?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full text-sm">
              <Clock size={14} className="text-slate-400" />
              <span className="font-mono text-slate-300">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-800/50">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                  {profile?.name?.substring(0, 2).toUpperCase() || 'AD'}
                </div>
                <ChevronDown size={16} className="text-slate-400" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                  <div className="p-3 border-b border-slate-700">
                    <p className="text-sm font-medium text-white truncate">{profile?.name}</p>
                    <p className="text-xs text-slate-400">org_admin</p>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50">
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Anggota" value={stats.total} color="bg-blue-600" />
                <StatCard icon={UserCheck} label="Sedang Aktif" value={stats.active} color="bg-green-600" />
                <StatCard icon={Radio} label="Operasi Aktif" value={stats.operations} color="bg-orange-600" />
                <StatCard icon={CheckCircle2} label="Selesai" value={stats.completed} color="bg-slate-600" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Operations */}
                <div className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Radio size={18} className="text-orange-400" /> Operasi Aktif
                  </h3>
                  {activeResponses.length === 0 ? (
                    <p className="text-slate-500 text-sm">Tidak ada operasi aktif</p>
                  ) : (
                    <div className="space-y-3">
                      {activeResponses.slice(0, 5).map(op => (
                        <div key={op.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-white">{op.name}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <MapPin size={12} /> {op.location || 'Lokasi tidak tersedia'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            op.urgency === 'critical' ? 'bg-red-600/20 text-red-400' :
                            op.urgency === 'high' ? 'bg-orange-600/20 text-orange-400' : 'bg-blue-600/20 text-blue-400'
                          }`}>{op.urgency || 'normal'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Status */}
                <div className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users size={18} className="text-blue-400" /> Status Tim
                  </h3>
                  {members.length === 0 ? (
                    <p className="text-slate-500 text-sm">Belum ada anggota tim</p>
                  ) : (
                    <div className="space-y-2">
                      {members.slice(0, 6).map(m => (
                        <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                              {m.name?.substring(0, 2).toUpperCase() || '??'}
                            </div>
                            <div>
                              <p className="text-sm text-white">{m.name}</p>
                              <p className="text-xs text-slate-500">{m.role}</p>
                            </div>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${
                            m.status === 'on_duty' ? 'bg-green-500' :
                            m.status === 'active' ? 'bg-yellow-500' : 'bg-slate-500'
                          }`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'operations' && (
            <div className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
              <p className="text-slate-400">Manajemen operasi - gunakan menu "Operasi Respon" di Field Dashboard untuk membuat operasi baru.</p>
              <button onClick={() => router.push(`/${orgSlug}/responder/dashboard`)} 
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
                Buka Field Dashboard
              </button>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="bg-slate-800/50 border border-white/5 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Nama</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Telepon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-slate-900/30">
                      <td className="px-4 py-3 text-sm text-white">{m.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{m.role}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          m.status === 'on_duty' ? 'bg-green-600/20 text-green-400' :
                          m.status === 'active' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-slate-600/20 text-slate-400'
                        }`}>{m.status || 'offline'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{m.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
              <p className="text-slate-400">Fitur laporan akan segera hadir.</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-slate-800/50 border border-white/5 rounded-xl p-5 max-w-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">Informasi Organisasi</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-slate-700 flex items-center justify-center overflow-hidden">
                    {organization?.logo_url ? (
                      <img src={organization.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={32} className="text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{organization?.name}</p>
                    <p className="text-sm text-slate-400">/{organization?.slug}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400">
                  Untuk mengubah logo dan pengaturan lainnya, gunakan menu Pengaturan di Field Dashboard.
                </p>
                <button onClick={() => router.push(`/${orgSlug}/responder/dashboard`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
                  Buka Field Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
