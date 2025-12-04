'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, AlertTriangle, ChevronRight, Loader2, CheckCircle2, Play, Navigation } from 'lucide-react';

interface Assignment {
  id: string;
  report_id: string;
  report_type: string;
  report_description: string;
  report_category: string;
  report_lat: number;
  report_lng: number;
  operation_name: string;
  disaster_type: string;
  status: string;
  priority: string;
  notes: string;
  assigned_at: string;
  assigner_name: string;
}

interface MyAssignmentsListProps {
  onSelectAssignment: (id: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  normal: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  accepted: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-green-500/20 text-green-400',
  declined: 'bg-red-500/20 text-red-400'
};

export default function MyAssignmentsList({ onSelectAssignment }: MyAssignmentsListProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-assignments');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAssignments(result.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'pending') return a.status === 'pending' || a.status === 'accepted';
    if (filter === 'in_progress') return a.status === 'in_progress';
    if (filter === 'completed') return a.status === 'completed';
    return true;
  });

  const pendingCount = assignments.filter(a => a.status === 'pending').length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Tugas Saya</h2>
        <p className="text-slate-400 mt-1">Daftar tugas yang ditugaskan kepada Anda</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'pending', label: `Menunggu (${pendingCount})` },
          { id: 'in_progress', label: 'Proses' },
          { id: 'completed', label: 'Selesai' }
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

      {filteredAssignments.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid gap-4">
          {filteredAssignments.map(a => (
            <AssignmentCard key={a.id} assignment={a} onClick={() => onSelectAssignment(a.id)} onRefresh={fetchAssignments} />
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
        {filter === 'pending' ? 'Tidak ada tugas menunggu' : filter === 'in_progress' ? 'Tidak ada tugas dalam proses' : 'Belum ada tugas'}
      </h3>
      <p className="text-slate-400">Tugas akan muncul di sini saat Anda ditugaskan</p>
    </div>
  );
}

function AssignmentCard({ assignment: a, onClick, onRefresh }: { assignment: Assignment; onClick: () => void; onRefresh: () => void }) {
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/my-assignments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update');
      onRefresh();
    } catch (err) {
      alert('Gagal mengupdate status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:bg-slate-800/60 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${PRIORITY_COLORS[a.priority]}`}>
              {a.priority === 'urgent' ? 'URGENT' : a.priority.toUpperCase()}
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[a.status]}`}>
              {a.status === 'pending' ? 'Menunggu' : a.status === 'accepted' ? 'Diterima' : a.status === 'in_progress' ? 'Proses' : a.status === 'completed' ? 'Selesai' : a.status}
            </span>
          </div>
          <p className="text-white font-medium mb-2 line-clamp-2">{a.report_description || 'Tidak ada deskripsi'}</p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(a.assigned_at).toLocaleDateString('id-ID')}</span>
            <span>{a.operation_name}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {a.status === 'pending' && (
            <button onClick={() => updateStatus('accepted')} disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> Terima
            </button>
          )}
          {a.status === 'accepted' && (
            <button onClick={() => updateStatus('in_progress')} disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg">
              <Play className="w-4 h-4" /> Mulai
            </button>
          )}
          {a.status === 'in_progress' && (
            <button onClick={() => updateStatus('completed')} disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> Selesai
            </button>
          )}
          {a.report_lat && a.report_lng && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${a.report_lat},${a.report_lng}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg">
              <Navigation className="w-4 h-4" /> Navigasi
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
