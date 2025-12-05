'use client';

import { useState, useEffect } from 'react';
import { User, CheckCircle, Clock, Coffee, XCircle, RefreshCw } from 'lucide-react';

interface StatusData {
  user_id: string;
  full_name: string;
  status: string;
  pending_tasks: number;
  active_tasks: number;
  completed_tasks: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  on_duty: { label: 'On Duty', icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  active: { label: 'Active', icon: User, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  off_duty: { label: 'Off Duty', icon: Coffee, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  inactive: { label: 'Inactive', icon: XCircle, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

export default function StatusControl() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/responder/status');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (updating || data?.status === newStatus) return;
    setUpdating(true);
    setError(null);

    try {
      const res = await fetch('/api/responder/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-5">
        <div className="flex justify-center py-4">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentConfig = STATUS_CONFIG[data.status] || STATUS_CONFIG.inactive;
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-5">
      {/* Current Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${currentConfig.bgColor}`}>
            <CurrentIcon className={`w-5 h-5 ${currentConfig.color}`} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Status Saat Ini</p>
            <p className={`text-lg font-bold ${currentConfig.color}`}>{currentConfig.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{data.active_tasks}</p>
          <p className="text-xs text-slate-400">Tugas Aktif</p>
        </div>
      </div>

      {/* Status Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = data.status === key;
          return (
            <button
              key={key}
              onClick={() => updateStatus(key)}
              disabled={updating || isActive}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? `${config.bgColor} ${config.color} border-2 border-current`
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-400">{data.pending_tasks}</p>
          <p className="text-[10px] text-slate-400 uppercase">Menunggu</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-400">{data.active_tasks}</p>
          <p className="text-[10px] text-slate-400 uppercase">Proses</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-400">{data.completed_tasks}</p>
          <p className="text-[10px] text-slate-400 uppercase">Selesai</p>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
    </div>
  );
}
