'use client';

import { Shield, Activity, Radio, FileText, Camera, Wifi, Settings, ChevronRight, ClipboardList, CheckSquare } from 'lucide-react';
import SidebarItem from './SidebarItem';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  organizationName?: string;
  organizationLogo?: string;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  userRole?: string;
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  activeTab,
  setActiveTab,
  organizationName,
  organizationLogo,
  isOffline,
  setIsOffline,
  userRole
}: SidebarProps) {
  return (
    <aside
      className={`relative flex flex-col h-full border-r border-white/5 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-50
        ${collapsed ? 'w-20' : 'w-72'} bg-[#18181b]`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 mb-2">
        <div className="relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 bg-orange-600 shadow-orange-500/20 overflow-hidden">
          {organizationLogo ? (
            <img src={organizationLogo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Shield className="text-white" size={24} />
          )}
        </div>
        {!collapsed && (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <h1 className="font-bold text-white text-lg leading-none tracking-tight">
              {organizationName || 'Loading...'}
            </h1>
            <span className="text-xs font-medium text-orange-500 tracking-wider">Field</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        <SidebarItem 
          icon={Activity} 
          label="My Dashboard" 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          collapsed={collapsed} 
          theme="orange" 
        />
        {userRole === 'org_admin' && (
          <SidebarItem 
            icon={Radio} 
            label="Operasi Respon" 
            active={activeTab === 'operations'} 
            onClick={() => setActiveTab('operations')} 
            collapsed={collapsed} 
            theme="orange" 
          />
        )}
        {userRole === 'org_responder' && (
          <>
            <SidebarItem 
              icon={ClipboardList} 
              label="Operasi Saya" 
              active={activeTab === 'my-operations'} 
              onClick={() => setActiveTab('my-operations')} 
              collapsed={collapsed} 
              theme="orange" 
            />
            <SidebarItem 
              icon={CheckSquare} 
              label="Tugas Saya" 
              active={activeTab === 'assignments'} 
              onClick={() => setActiveTab('assignments')} 
              collapsed={collapsed} 
              theme="orange" 
            />
          </>
        )}
        <SidebarItem 
          icon={FileText} 
          label="Log Harian" 
          active={activeTab === 'log'} 
          onClick={() => setActiveTab('log')} 
          collapsed={collapsed} 
          badge="New" 
          theme="orange" 
        />
        <SidebarItem icon={Camera} label="Unggah Bukti" collapsed={collapsed} theme="orange" />
        <SidebarItem 
          icon={Wifi} 
          label="Offline Mode" 
          collapsed={collapsed} 
          theme={isOffline ? 'orange' : 'slate'} 
          onClick={() => setIsOffline(!isOffline)} 
        />
      </nav>

      {/* Footer */}
      <div className="px-4 py-6 border-t border-white/5 space-y-2">
        <SidebarItem icon={Settings} label="Pengaturan" collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          {collapsed ? (
            <ChevronRight size={20} />
          ) : (
            <span className="text-xs font-medium uppercase tracking-widest">Collapse</span>
          )}
        </button>
      </div>
    </aside>
  );
}
