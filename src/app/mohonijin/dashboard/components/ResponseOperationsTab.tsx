'use client';

import { useState, useEffect } from 'react';
import { Radio, Building2, Users, CheckCircle, Clock, AlertTriangle, RefreshCw, Eye, MapPin } from 'lucide-react';

interface Operation {
  id: string;
  name: string;
  disaster_type: string;
  status: 'active' | 'completed' | 'suspended' | 'archived';
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  disaster_location_name: string;
  disaster_lat: number;
  disaster_lng: number;
  created_by_name: string;
  team_count: number;
  active_team_count: number;
  total_assignments: number;
  completed_assignments: number;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  completed: number;
  suspended: number;
  organizations_involved: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Aktif', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
  completed: { label: 'Selesai', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  suspended: { label: 'Ditangguhkan', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  archived: { label: 'Diarsipkan', color: 'text-slate-400', bgColor: 'bg-slate-500/10 border-slate-500/20' },
};

interface Props {
  onViewDetail?: (operationId: string) => void;
}

export default function ResponseOperationsTab({ onViewDetail }: Props) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchOperations();
  }, [statusFilter]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/mohonijin/operations?${params}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setOperations(result.data || []);
      setStats(result.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (opId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/mohonijin/operations/${opId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchOperations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl">
            <Radio className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Operasi Respon Bencana</h2>
            <p className="text-xs text-slate-400">Semua operasi dari seluruh organisasi</p>
          </div>
        </div>
        <button onClick={fetchOperations} disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-slate-400">Total Operasi</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            <p className="text-xs text-slate-400">Aktif</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-400">{stats.completed}</p>
            <p className="text-xs text-slate-400">Selesai</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
            <p className="text-2xl font-bold text-orange-400">{stats.suspended}</p>
            <p className="text-xs text-slate-400">Ditangguhkan</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <p className="text-2xl font-bold text-purple-400">{stats.organizations_involved}</p>
            <p className="text-xs text-slate-400">Organisasi</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="completed">Selesai</option>
          <option value="suspended">Ditangguhkan</option>
          <option value="archived">Diarsipkan</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Operations List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : operations.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Radio className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada operasi respon</p>
          </div>
        ) : (
          operations.map(op => {
            const statusConfig = STATUS_CONFIG[op.status] || STATUS_CONFIG.active;
            const completionRate = op.total_assignments > 0 
              ? Math.round((op.completed_assignments / op.total_assignments) * 100) 
              : 0;

            return (
              <div key={op.id} className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-slate-500">{op.disaster_type}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{op.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {op.organization_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {op.disaster_location_name}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => onViewDetail?.(op.id)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                    <Eye className="w-4 h-4 text-slate-300" />
                  </button>
                </div>

                {/* Stats Row */}
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-lg font-bold text-white">{op.active_team_count}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Tim Aktif</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{op.total_assignments}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Penugasan</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-400">{op.completed_assignments}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Selesai</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-400">{completionRate}%</p>
                    <p className="text-[10px] text-slate-400 uppercase">Progress</p>
                  </div>
                </div>

                {/* Quick Actions */}
                {op.status === 'active' && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => updateStatus(op.id, 'completed')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs rounded-lg">
                      <CheckCircle className="w-3 h-3" /> Selesaikan
                    </button>
                    <button onClick={() => updateStatus(op.id, 'suspended')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 text-xs rounded-lg">
                      <AlertTriangle className="w-3 h-3" /> Tangguhkan
                    </button>
                  </div>
                )}
                {op.status === 'suspended' && (
                  <div className="mt-3">
                    <button onClick={() => updateStatus(op.id, 'active')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs rounded-lg">
                      <Radio className="w-3 h-3" /> Aktifkan Kembali
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
