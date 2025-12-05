'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { logoutUser } from '@/lib/auth/api';
import NotificationBell from './NotificationBell';

interface DashboardHeaderProps {
  activeTab: string;
  profile: any;
  currentTime: Date;
  currentLocation: { lat: number; lng: number } | null;
  isOffline: boolean;
  pendingAssignments: number;
  onUpdateStatus: (status: string) => void;
  onMenuClick?: () => void;
}

export default function DashboardHeader({
  activeTab,
  profile,
  currentTime,
  currentLocation,
  isOffline,
  pendingAssignments,
  onUpdateStatus,
  onMenuClick
}: DashboardHeaderProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/masuk');
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Field Dashboard';
      case 'operations': return 'Operasi Respon';
      case 'log': return 'Log Harian';
      default: return 'Dashboard';
    }
  };

  const getStatusText = () => {
    if (isOffline) return 'Offline Mode Active';
    const status = profile?.status === 'on_duty' ? 'On Duty' : profile?.status === 'active' ? 'Active' : 'Off Duty';
    const gps = currentLocation ? 'Active' : 'Inactive';
    return `${status} • GPS ${gps}`;
  };

  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 z-10 shrink-0">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile menu button */}
        {onMenuClick && (
          <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/10 text-slate-300">
            <Menu size={24} />
          </button>
        )}
        <div className="flex flex-col">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{getTitle()}</h2>
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              profile?.status === 'on_duty' ? 'bg-green-500' : 
              profile?.status === 'active' ? 'bg-yellow-500' : 'bg-slate-500'
            }`} />
            {getStatusText()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Time - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-white/5 text-sm">
          <Clock size={14} className="text-slate-400" />
          <span className="font-mono text-slate-300">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Status Toggle - compact on mobile */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-800/50 rounded-full border border-white/5 p-1">
          <button
            onClick={() => onUpdateStatus('on_duty')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              profile?.status === 'on_duty' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            On Duty
          </button>
          <button
            onClick={() => onUpdateStatus('off_duty')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              profile?.status === 'off_duty' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Off
          </button>
        </div>

        {/* Notifications */}
        <NotificationBell userId={profile?.user_id} />

        {/* Avatar with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1 sm:gap-2 p-1 rounded-full hover:bg-slate-800/50 transition"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 border-2 border-slate-900 shadow-lg flex items-center justify-center text-white font-bold text-sm">
              {profile?.name?.substring(0, 2).toUpperCase() || 'RS'}
            </div>
            <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
              <div className="p-3 border-b border-slate-700">
                <p className="text-sm font-medium text-white truncate">{profile?.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{profile?.role || 'responder'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition"
              >
                <LogOut size={16} />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
