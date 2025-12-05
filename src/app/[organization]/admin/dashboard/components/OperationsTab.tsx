'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Plus, MapPin, Users, ChevronRight, RefreshCw, AlertTriangle, CheckCircle2, Pause } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CreateOperationModal from './CreateOperationModal';
import OperationDetailPanel from './OperationDetailPanel';

interface Operation {
  id: string;
  name: string;
  disaster_type: string;
  disaster_location_name: string;
  status: 'active' | 'completed' | 'suspended';
  team_count: number;
  assignments_count: number;
  created_at: string;
}

const STATUS_CONFIG = {
  active: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Aktif', icon: CheckCircle2 },
  completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Selesai', icon: CheckCircle2 },
  suspended: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Ditunda', icon: Pause }
};

const DISASTER_TYPES: Record<string, string> = {
  flood: 'Banjir', earthquake: 'Gempa Bumi', fire: 'Kebakaran',
  landslide: 'Tanah Longsor', tsunami: 'Tsunami', volcano: 'Gunung Berapi',
  storm: 'Badai', drought: 'Kekeringan', pandemic: 'Pandemi', other: 'Lainnya'
};

export default function OperationsTab({ organizationId }: { organizationId: string }) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'suspended'>('all');

  const fetchOperations = useCallback(async () => {
    try {
      setLoading(true);
      const url = filter === 'all' ? '/api/operations' : `/api/operations?status=${filter}`;
      const res = await fetch(url);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setOperations(result.data || []);
    } catch (err: any) {
      toast.error('Gagal memuat operasi: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchOperations(); }, [fetchOperations]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchOperations();
    toast.success('Operasi berhasil dibuat!');
  };

  if (selectedOperation) {
    return (
      <OperationDetailPanel
        operationId={selectedOperation}
        onBack={() => setSelectedOperation(null)}
        onRefresh={fetchOperations}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-orange-400" /> Manajemen Operasi
          </h3>
          <p className="text-sm text-slate-400 mt-1">Kelola operasi respon bencana dan tim responder</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchOperations} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
            <Plus className="w-4 h-4" /> Buat Operasi
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'completed', 'suspended'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}>
            {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : f === 'completed' ? 'Selesai' : 'Ditunda'}
          </button>
        ))}
      </div>

      {/* Operations List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : operations.length === 0 ? (
        <EmptyState onCreateNew={() => setShowCreateModal(true)} />
      ) : (
        <div className="grid gap-4">
          {operations.map(op => (
            <OperationCard key={op.id} operation={op} onClick={() => setSelectedOperation(op.id)} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateOperationModal onClose={() => setShowCreateModal(false)} onSuccess={handleCreateSuccess} />
      )}
    </div>
  );
}

function OperationCard({ operation, onClick }: { operation: Operation; onClick: () => void }) {
  const status = STATUS_CONFIG[operation.status];
  const StatusIcon = status.icon;

  return (
    <button onClick={onClick}
      className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-5 hover:bg-slate-800/70 transition-colors text-left">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>
              <StatusIcon className="w-3 h-3" /> {status.label}
            </span>
            <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300">
              {DISASTER_TYPES[operation.disaster_type] || operation.disaster_type}
            </span>
          </div>
          <h4 className="text-white font-medium mb-1">{operation.name}</h4>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {operation.disaster_location_name}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {operation.team_count} anggota</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500" />
      </div>
    </button>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-white/5">
      <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Belum ada operasi</h3>
      <p className="text-slate-400 mb-6">Buat operasi respon bencana pertama Anda</p>
      <button onClick={onCreateNew}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
        <Plus className="w-4 h-4" /> Buat Operasi Baru
      </button>
    </div>
  );
}
