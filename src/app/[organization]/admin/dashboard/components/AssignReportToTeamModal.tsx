'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, Radio, MapPin, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AssignReportToTeamModalProps {
  report: {
    id: string;
    full_name: string;
    description: string;
    address?: string;
    created_at: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface Operation {
  id: string;
  name: string;
  disaster_type: string;
  status: string;
  team_count: number;
}

interface TeamMember {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  status: string;
}

export default function AssignReportToTeamModal({ report, onClose, onSuccess }: AssignReportToTeamModalProps) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchOperations();
  }, []);

  useEffect(() => {
    if (selectedOperation) {
      fetchTeamMembers(selectedOperation);
    } else {
      setTeamMembers([]);
      setSelectedMember(null);
    }
  }, [selectedOperation]);

  const fetchOperations = async () => {
    try {
      const res = await fetch('/api/operations?status=active');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setOperations(result.data || []);
    } catch (err: any) {
      toast.error('Gagal memuat operasi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (opId: string) => {
    try {
      const res = await fetch(`/api/operations/${opId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const members = (result.data?.team_members || []).filter((m: TeamMember) => m.status === 'accepted');
      setTeamMembers(members);
    } catch (err: any) {
      toast.error('Gagal memuat tim: ' + err.message);
    }
  };

  const handleAssign = async () => {
    if (!selectedOperation || !selectedMember) {
      toast.error('Pilih operasi dan anggota tim');
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`/api/operations/${selectedOperation}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: report.id,
          report_type: 'emergency_report',
          assigned_to: selectedMember,
          priority,
          notes: notes.trim() || undefined
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onSuccess();
    } catch (err: any) {
      toast.error('Gagal menugaskan: ' + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-600 text-slate-300',
    normal: 'bg-blue-600 text-white',
    high: 'bg-orange-600 text-white',
    urgent: 'bg-red-600 text-white'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-800 border border-white/10 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-slate-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" /> Tugaskan Laporan
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Report Info */}
          <div className="bg-slate-700/30 rounded-xl p-4">
            <h4 className="text-white font-medium mb-1">{report.full_name}</h4>
            <p className="text-sm text-slate-400 line-clamp-2">{report.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              {report.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {report.address}</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(report.created_at).toLocaleDateString('id-ID')}</span>
            </div>
          </div>

          {/* Select Operation */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Pilih Operasi Aktif</label>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
            ) : operations.length === 0 ? (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                Tidak ada operasi aktif. Buat operasi terlebih dahulu.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {operations.map(op => (
                  <button key={op.id} onClick={() => setSelectedOperation(op.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                      selectedOperation === op.id ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'
                    }`}>
                    <Radio className="w-4 h-4 text-blue-400" />
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{op.name}</p>
                      <p className="text-xs text-slate-400">{op.team_count} anggota tim</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Select Team Member */}
          {selectedOperation && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tugaskan ke</label>
              {teamMembers.length === 0 ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                  Tidak ada anggota tim aktif di operasi ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {teamMembers.map(m => (
                    <button key={m.user_id} onClick={() => setSelectedMember(m.user_id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        selectedMember === m.user_id ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'
                      }`}>
                      <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {(m.user_name || 'U').charAt(0)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white text-sm font-medium">{m.user_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400 capitalize">{m.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Prioritas</label>
            <div className="flex gap-2">
              {(['low', 'normal', 'high', 'urgent'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    priority === p ? priorityColors[p] : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}>
                  {p === 'low' ? 'Rendah' : p === 'normal' ? 'Normal' : p === 'high' ? 'Tinggi' : 'Urgent'}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Catatan (opsional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Instruksi tambahan..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" rows={2} />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Batal</button>
          <button onClick={handleAssign} disabled={assigning || !selectedOperation || !selectedMember}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl">
            {assigning ? <><Loader2 className="w-4 h-4 animate-spin" /> Menugaskan...</> : <><UserPlus className="w-4 h-4" /> Tugaskan</>}
          </button>
        </div>
      </div>
    </div>
  );
}
