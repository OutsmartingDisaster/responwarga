'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, MapPin, Users, FileText, Clock, CheckCircle2, AlertTriangle, Pause, ChevronRight, Search, Filter } from 'lucide-react';
import { DISASTER_TYPES, ResponseOperation, OperationStatus } from '@/types/operations';

interface OperationsListProps {
  onCreateNew: () => void;
  onSelectOperation: (id: string) => void;
}

const STATUS_CONFIG: Record<OperationStatus, { color: string; icon: React.ReactNode; label: string }> = {
  active: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <AlertTriangle className="w-4 h-4" />, label: 'Aktif' },
  completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Selesai' },
  suspended: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Pause className="w-4 h-4" />, label: 'Ditunda' }
};

export default function OperationsList({ onCreateNew, onSelectOperation }: OperationsListProps) {
  const [operations, setOperations] = useState<ResponseOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OperationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOperations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const response = await fetch(`/api/operations?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setOperations(result.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchOperations(); }, [fetchOperations]);

  const filteredOperations = operations.filter(op => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return op.name.toLowerCase().includes(q) || op.disaster_location_name.toLowerCase().includes(q) || DISASTER_TYPES[op.disaster_type]?.toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Operasi Respon</h2>
          <p className="text-slate-400 mt-1">Kelola operasi respon bencana organisasi Anda</p>
        </div>
        <button onClick={onCreateNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
          <Plus className="w-5 h-5" /><span>Aktivasi Respon Baru</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Cari operasi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as OperationStatus | 'all')}
            className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="completed">Selesai</option>
            <option value="suspended">Ditunda</option>
          </select>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">{error}</div>}

      {/* List */}
      {filteredOperations.length === 0 ? (
        <EmptyState onCreateNew={onCreateNew} />
      ) : (
        <div className="grid gap-4">
          {filteredOperations.map(op => <OperationCard key={op.id} operation={op} onClick={() => onSelectOperation(op.id)} />)}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-white/5">
      <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Belum ada operasi respon</h3>
      <p className="text-slate-400 mb-6">Mulai dengan mengaktivasi respon bencana baru</p>
      <button onClick={onCreateNew} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
        <Plus className="w-5 h-5" /><span>Aktivasi Respon Baru</span>
      </button>
    </div>
  );
}

function OperationCard({ operation, onClick }: { operation: ResponseOperation; onClick: () => void }) {
  const status = STATUS_CONFIG[operation.status];
  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div onClick={onClick} className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:bg-slate-800/60 hover:border-white/20 transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${status.color}`}>
              {status.icon}{status.label}
            </span>
            <span className="px-2.5 py-1 bg-slate-700/50 rounded-lg text-xs font-medium text-slate-300">{DISASTER_TYPES[operation.disaster_type]}</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 truncate">{operation.name}</h3>
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{operation.disaster_location_name}</span>
            <span className="text-slate-500">•</span>
            <span>Radius {operation.disaster_radius_km} km</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-slate-400"><Users className="w-4 h-4" /><span>{operation.team_count || 0} anggota</span></div>
            <div className="flex items-center gap-1.5 text-slate-400"><FileText className="w-4 h-4" /><span>{operation.field_reports_count || 0} laporan</span></div>
            <div className="flex items-center gap-1.5 text-slate-400"><Clock className="w-4 h-4" /><span>{formatDate(operation.started_at)}</span></div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors flex-shrink-0" />
      </div>
    </div>
  );
}
