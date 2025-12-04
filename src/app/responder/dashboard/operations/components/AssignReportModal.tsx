'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Loader2, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { ResponseTeamMember, AssignmentPriority } from '@/types/operations';

interface Report {
  id: string;
  type: 'emergency_report' | 'community_contribution';
  title?: string;
  description?: string;
  category?: string;
  distance_km?: number;
  created_at: string;
}

interface AssignReportModalProps {
  operationId: string;
  report: Report;
  teamMembers: ResponseTeamMember[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignReportModal({ operationId, report, teamMembers, onClose, onSuccess }: AssignReportModalProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [priority, setPriority] = useState<AssignmentPriority>('normal');
  const [notes, setNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedMembers = teamMembers.filter(m => m.status === 'accepted');

  const handleAssign = async () => {
    if (!selectedMember) return setError('Pilih anggota tim');
    
    setAssigning(true);
    setError(null);
    try {
      const response = await fetch(`/api/operations/${operationId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: report.id,
          report_type: report.type,
          assigned_to: selectedMember,
          priority,
          notes: notes.trim() || undefined
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal menugaskan');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-800 border border-white/10 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" /> Tugaskan Laporan
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
          
          {/* Report Info */}
          <div className="bg-slate-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                report.type === 'emergency_report' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {report.type === 'emergency_report' ? 'Darurat' : 'Kontribusi'}
              </span>
              {report.category && <span className="px-2 py-0.5 bg-slate-600/50 rounded text-xs text-slate-300">{report.category}</span>}
            </div>
            <p className="text-white font-medium line-clamp-2">{report.title || report.description || 'Tidak ada deskripsi'}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              {report.distance_km !== undefined && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {report.distance_km.toFixed(1)} km</span>
              )}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(report.created_at).toLocaleDateString('id-ID')}</span>
            </div>
          </div>

          {/* Team Member Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tugaskan ke</label>
            {acceptedMembers.length === 0 ? (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Tidak ada anggota tim yang tersedia
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {acceptedMembers.map(member => (
                  <button key={member.user_id} onClick={() => setSelectedMember(member.user_id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      selectedMember === member.user_id ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'
                    }`}>
                    <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {((member as any).user_name || 'U').charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{(member as any).user_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400 capitalize">{member.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Prioritas</label>
            <div className="flex gap-2">
              {(['low', 'normal', 'high', 'urgent'] as AssignmentPriority[]).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    priority === p ? getPriorityColor(p) : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}>
                  {p === 'low' ? 'Rendah' : p === 'normal' ? 'Normal' : p === 'high' ? 'Tinggi' : 'Urgent'}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Catatan (opsional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instruksi tambahan..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" rows={2} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Batal</button>
          <button onClick={handleAssign} disabled={assigning || !selectedMember || acceptedMembers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
            {assigning ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Menugaskan...</span></> : <><UserPlus className="w-4 h-4" /><span>Tugaskan</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function getPriorityColor(priority: AssignmentPriority): string {
  const colors: Record<AssignmentPriority, string> = {
    low: 'bg-slate-600 text-white',
    normal: 'bg-blue-600 text-white',
    high: 'bg-orange-600 text-white',
    urgent: 'bg-red-600 text-white'
  };
  return colors[priority];
}
