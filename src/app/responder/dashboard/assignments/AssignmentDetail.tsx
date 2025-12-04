'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, MapPin, Clock, User, CheckCircle2, Play, Navigation, MessageSquare, Loader2 } from 'lucide-react';

interface AssignmentDetailProps {
  assignmentId: string;
  onBack: () => void;
}

export default function AssignmentDetail({ assignmentId, onBack }: AssignmentDetailProps) {
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchAssignment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/my-assignments/${assignmentId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAssignment(result.data);
      setResponseNotes(result.data.response_notes || '');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => { fetchAssignment(); }, [fetchAssignment]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/my-assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, response_notes: responseNotes })
      });
      if (!response.ok) throw new Error('Failed to update');
      fetchAssignment();
    } catch (err) {
      alert('Gagal mengupdate status');
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/my-assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_notes: responseNotes })
      });
      if (!response.ok) throw new Error('Failed to save');
      alert('Catatan tersimpan');
    } catch (err) {
      alert('Gagal menyimpan catatan');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  if (error || !assignment) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" /> Kembali
        </button>
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">{error || 'Tugas tidak ditemukan'}</div>
      </div>
    );
  }

  const a = assignment;
  const priorityColors: Record<string, string> = {
    low: 'bg-slate-500/20 text-slate-400', normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400', urgent: 'bg-red-500/20 text-red-400'
  };
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400', accepted: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-purple-500/20 text-purple-400', completed: 'bg-green-500/20 text-green-400'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg mt-1">
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${priorityColors[a.priority]}`}>{a.priority.toUpperCase()}</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[a.status]}`}>
              {a.status === 'pending' ? 'Menunggu' : a.status === 'accepted' ? 'Diterima' : a.status === 'in_progress' ? 'Proses' : 'Selesai'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">Detail Tugas</h2>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Report Info */}
        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Informasi Laporan</h3>
          <p className="text-slate-300">{a.report_description || 'Tidak ada deskripsi'}</p>
          <div className="space-y-2 text-sm">
            {a.report_category && <div className="flex items-center gap-2 text-slate-400"><span>Kategori:</span><span className="text-white">{a.report_category}</span></div>}
            <div className="flex items-center gap-2 text-slate-400"><Clock className="w-4 h-4" /><span>{new Date(a.assigned_at).toLocaleString('id-ID')}</span></div>
            <div className="flex items-center gap-2 text-slate-400"><User className="w-4 h-4" /><span>Ditugaskan oleh: {a.assigner_name}</span></div>
          </div>
          {a.report_lat && a.report_lng && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${a.report_lat},${a.report_lng}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
              <Navigation className="w-4 h-4" /> Buka di Google Maps
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Aksi</h3>
          <div className="flex flex-wrap gap-2">
            {a.status === 'pending' && (
              <button onClick={() => updateStatus('accepted')} disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl">
                <CheckCircle2 className="w-4 h-4" /> Terima Tugas
              </button>
            )}
            {a.status === 'accepted' && (
              <button onClick={() => updateStatus('in_progress')} disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                <Play className="w-4 h-4" /> Mulai Kerjakan
              </button>
            )}
            {a.status === 'in_progress' && (
              <button onClick={() => updateStatus('completed')} disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl">
                <CheckCircle2 className="w-4 h-4" /> Tandai Selesai
              </button>
            )}
          </div>

          {/* Response Notes */}
          <div className="pt-4 border-t border-white/10">
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Catatan Respon
            </label>
            <textarea value={responseNotes} onChange={e => setResponseNotes(e.target.value)} rows={4}
              placeholder="Tambahkan catatan tentang penanganan tugas ini..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
            <button onClick={saveNotes} disabled={updating}
              className="mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
              Simpan Catatan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
