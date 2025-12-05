'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Clock, AlertTriangle, UserPlus, ClipboardList, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface NotificationBellProps {
  userId?: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead } = useRealtimeNotifications(userId || null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_assignment': return <ClipboardList className="w-4 h-4 text-blue-400" />;
      case 'invitation': return <UserPlus className="w-4 h-4 text-green-400" />;
      case 'assignment_update': return <Check className="w-4 h-4 text-purple-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 text-slate-300 hover:text-white transition-colors">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-800 ${isConnected ? 'bg-green-500' : 'bg-slate-500'}`} 
          title={isConnected ? 'Real-time connected' : 'Connecting...'} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="font-semibold text-white">Notifikasi</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-blue-400 hover:text-blue-300">Tandai semua dibaca</button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Tidak ada notifikasi</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-4 border-b border-white/5 hover:bg-slate-700/50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-500/5' : ''}`}>
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${n.is_read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
