'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { DISASTER_TYPES, ResponseOperation, TeamMemberStatus } from '@/types/operations';

interface MyOperation {
  id: string;
  operation: ResponseOperation;
  status: TeamMemberStatus;
  role: string;
  invited_at: string;
}

interface MyOperationsListProps {
  onSelectOperation: (id: string) => void;
}

export default function MyOperationsList({ onSelectOperation }: MyOperationsListProps) {
  const [operations, setOperations] = useState<MyOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'invited' | 'accepted'>('all');

  const fetchMyOperations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-operations');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setOperations(result.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMyOperations(); }, [fetchMyOperations]);

  const handleResponse = async (operationId: string, accept: boolean) => {
    try {
      const response = await fetch(`/api/my-operations/${operationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      fetchMyOperations();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredOps = operations.filter(op => {
    if (filter === 'invited') return op.status === 'invited';
    if (filter === 'accepted') return op.status === 'accepted';
    return true;
  });

  const invitedCount = operations.filter(o => o.status === 'invited').length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Operasi Saya</h2>
        <p className="text-slate-400 mt-1">Operasi respon yang Anda ikuti</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'invited', label: `Undangan (${invitedCount})` },
          { id: 'accepted', label: 'Bergabung' }
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">{error}</div>}

      {/* List */}
      {filteredOps.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid gap-4">
          {filteredOps.map(item => (
            <OperationCard key={item.id} item={item} onSelect={() => onSelectOperation(item.operation.id)} onRespond={handleResponse} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-white/5">
      <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">
        {filter === 'invited' ? 'Tidak ada undangan' : filter === 'accepted' ? 'Belum bergabung operasi' : 'Belum ada operasi'}
      </h3>
      <p className="text-slate-400">Anda akan menerima undangan dari koordinator operasi</p>
    </div>
  );
}

function OperationCard({ item, onSelect, onRespond }: { item: MyOperation; onSelect: () => void; onRespond: (id: string, accept: boolean) => void }) {
  const op = item.operation;
  const isInvited = item.status === 'invited';

  return (
    <div className={`bg-slate-800/40 backdrop-blur-md border rounded-2xl p-5 transition-all ${
      isInvited ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5 hover:bg-slate-800/60 cursor-pointer'
    }`} onClick={!isInvited ? onSelect : undefined}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Status */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
              isInvited ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {isInvited ? 'Undangan Baru' : 'Bergabung'}
            </span>
            <span className="px-2.5 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-300">{DISASTER_TYPES[op.disaster_type]}</span>
            <span className="px-2 py-0.5 bg-slate-600/50 rounded text-xs text-slate-400 capitalize">{item.role}</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-white mb-2">{op.name}</h3>
          
          {/* Location */}
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
            <MapPin className="w-4 h-4" />
            <span>{op.disaster_location_name}</span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.invited_at).toLocaleDateString('id-ID')}</span>
          </div>
        </div>

        {/* Actions */}
        {isInvited ? (
          <div className="flex flex-col gap-2">
            <button onClick={() => onRespond(op.id, true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> Terima
            </button>
            <button onClick={() => onRespond(op.id, false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg">
              <XCircle className="w-4 h-4" /> Tolak
            </button>
          </div>
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-500" />
        )}
      </div>
    </div>
  );
}
