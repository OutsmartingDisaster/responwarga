'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Activity, Building2, FileText, Map, Settings, ChevronRight, Clock, Bell } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { createApiClient } from '@/lib/api-client';
import SuperAdminOverview from './components/SuperAdminOverview';
import OrganizationsView from './components/OrganizationsView';
import AllReportsView from './components/AllReportsView';
import LiveMapView from './components/LiveMapView';

export default function SuperAdminDashboard() {
  const api = useMemo(() => createApiClient(), []);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({ organizations: 0, totalReports: 0, activeOperations: 0, totalResponders: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [orgsRes, reportsRes, opsRes, respondersRes] = await Promise.all([
          fetch('/api/mohonijin/stats/organizations'),
          fetch('/api/mohonijin/stats/reports'),
          fetch('/api/mohonijin/stats/operations'),
          fetch('/api/mohonijin/stats/responders')
        ]);
        const [orgs, reports, ops, responders] = await Promise.all([
          orgsRes.json(), reportsRes.json(), opsRes.json(), respondersRes.json()
        ]);
        setStats({
          organizations: orgs.count || 0,
          totalReports: reports.count || 0,
          activeOperations: ops.count || 0,
          totalResponders: responders.count || 0
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'organizations', label: 'Organisasi', icon: Building2 },
    { id: 'reports', label: 'Semua Laporan', icon: FileText },
    { id: 'map', label: 'Peta Live', icon: Map }
  ];

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-300 overflow-hidden">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className={`relative flex flex-col h-full border-r border-white/5 transition-all duration-300 z-50 ${sidebarCollapsed ? 'w-20' : 'w-72'} bg-[#0f172a]`}>
        <div className="flex items-center gap-3 p-6 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-600 shadow-lg shadow-purple-500/20">
            <Shield className="text-white" size={24} />
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="font-bold text-white text-lg">BPBD <span className="text-purple-500">Super</span></h1>
              <span className="text-xs text-slate-500">Administrator</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {tabs.map(tab => (
            <SidebarItem key={tab.id} icon={tab.icon} label={tab.label} active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        <div className="px-4 py-6 border-t border-white/5">
          <SidebarItem icon={Settings} label="Pengaturan" collapsed={sidebarCollapsed} />
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center w-full p-2 mt-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg">
            {sidebarCollapsed ? <ChevronRight size={20} /> : <span className="text-xs uppercase tracking-widest">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 blur-[120px] pointer-events-none bg-purple-600/10" />

        <header className="flex items-center justify-between px-8 py-5 z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
            </h2>
            <p className="text-sm text-slate-400">{stats.organizations} Organisasi • {stats.activeOperations} Operasi Aktif</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-white/5 text-sm">
              <Clock size={14} className="text-slate-400" />
              <span className="font-mono text-slate-300">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button className="p-2.5 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 text-slate-300">
              <Bell size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 border-2 border-slate-900 flex items-center justify-center text-white font-bold">SA</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 z-10">
          {activeTab === 'overview' && <SuperAdminOverview stats={stats} />}
          {activeTab === 'organizations' && <OrganizationsView />}
          {activeTab === 'reports' && <AllReportsView />}
          {activeTab === 'map' && <LiveMapView />}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick, collapsed }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-4 p-3 w-full rounded-xl transition-all ${active ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
      <Icon size={20} />
      {!collapsed && <span className="font-medium text-sm flex-1 text-left">{label}</span>}
    </button>
  );
}
