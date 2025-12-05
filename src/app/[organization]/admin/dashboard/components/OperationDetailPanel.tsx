'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, MapPin, Users, FileText, UserPlus, RefreshCw, CheckCircle2, Pause, Play, AlertTriangle, ClipboardList } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AssignTeamModal from './AssignTeamModal';

interface Operation {
  id: string;
  name: string;
  disaster_type: string;
  description?: string;
  disaster_location_name: string;
  disaster_lat: number;
  disaster_lng: number;
  disaster_radius_km: number;
  status: 'active' | 'completed' | 'suspended';
  team_count: number;
  created_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  user_name: string;
  user_phone?: string;
  role: string;
  status: 'invited' | 'accepted' | 'declined';
}

interface Assignment {
  id: string;
  report_id: string;
  report_name?: string;
  report_description?: string;
  assignee_name: string;
  status: string;
  priority: string;
  assigned_at: string;
}

const STATUS_CONFIG = {
  active: { color: 'bg-green-500/20 text-green-400', label: 'Aktif' },
  completed: { color: 'bg-blue-500/20 text-blue-400', label: 'Selesai' },
  suspended: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Ditunda' }
};

const DISASTER_TYPES: Record<string, string> = {
  flood: 'Banjir', earthquake: 'Gempa Bumi', fire: 'Kebakaran',
  landslide: 'Tanah Longsor', tsunami: 'Tsunami', other: 'Lainnya'
};

export default function OperationDetailPanel({ operationId, onBack, onRefresh }: {
  operationId: string;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [operation, setOperation] = useState<Operation | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'assignments'>('overview');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchOperation = useCallback(async () => {
    try {
      const res = await fetch(`/api/operations/${operationId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setOperation(result.data);
      setTeamMembers(result.data.team_members || []);
    } catch (err: any) {
      toast.error('Gagal memuat operasi: ' + err.message);
    }
  }, [operationId]);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/operations/${operationId}/assignments`);
      const result = await res.json();
      if (res.ok) setAssignments(result.data || []);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  }, [operationId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOperation(), fetchAssignments()]).finally(() => setLoading(false));
  }, [fetchOperation, fetchAssignments]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/operations/${operationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setOperation(result.data);
      onRefresh();
      toast.success('Status operasi diperbarui');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Kembali
        </button>
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
          Operasi tidak ditemukan
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: AlertTriangle },
    { id: 'team', label: 'Tim', icon: Users, badge: teamMembers.length },
    { id: 'assignments', label: 'Penugasan', icon: ClipboardList, badge: assignments.length }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_CONFIG[operation.status].color}`}>
                {STATUS_CONFIG[operation.status].label}
              </span>
              <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300">
                {DISASTER_TYPES[operation.disaster_type] || operation.disaster_type}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{operation.name}</h2>
            <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {operation.disaster_location_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => Promise.all([fetchOperation(), fetchAssignments()])}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
          {operation.status === 'active' && (
            <>
              <button onClick={() => handleStatusChange('suspended')}
                className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg text-sm">
                <Pause className="w-3 h-3" /> Tunda
              </button>
              <button onClick={() => handleStatusChange('completed')}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm">
                <CheckCircle2 className="w-3 h-3" /> Selesai
              </button>
            </>
          )}
          {operation.status === 'suspended' && (
            <button onClick={() => handleStatusChange('active')}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm">
              <Play className="w-3 h-3" /> Aktifkan
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && <OverviewTab operation={operation} teamCount={teamMembers.filter(m => m.status === 'accepted').length} />}
      {activeTab === 'team' && <TeamTab members={teamMembers} onInvite={() => setShowAssignModal(true)} onRefresh={fetchOperation} />}
      {activeTab === 'assignments' && <AssignmentsTab assignments={assignments} />}

      {showAssignModal && (
        <AssignTeamModal operationId={operationId} onClose={() => setShowAssignModal(false)} onSuccess={() => { setShowAssignModal(false); fetchOperation(); }} />
      )}
    </div>
  );
}

function OverviewTab({ operation, teamCount }: { operation: Operation; teamCount: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
        <h4 className="text-sm font-medium text-slate-400 mb-3">Informasi Operasi</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Radius</span><span className="text-white">{operation.disaster_radius_km} km</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Tim Aktif</span><span className="text-white">{teamCount} orang</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Dibuat</span><span className="text-white">{new Date(operation.created_at).toLocaleDateString('id-ID')}</span></div>
        </div>
      </div>
      {operation.description && (
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Deskripsi</h4>
          <p className="text-white text-sm">{operation.description}</p>
        </div>
      )}
    </div>
  );
}

function TeamTab({ members, onInvite, onRefresh }: { members: TeamMember[]; onInvite: () => void; onRefresh: () => void }) {
  const statusColors: Record<string, string> = {
    accepted: 'bg-green-500/20 text-green-400',
    declined: 'bg-red-500/20 text-red-400',
    invited: 'bg-yellow-500/20 text-yellow-400'
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-white font-medium">Anggota Tim ({members.length})</h4>
        <button onClick={onInvite} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
          <UserPlus className="w-4 h-4" /> Tambah Anggota
        </button>
      </div>
      {members.length === 0 ? (
        <div className="text-center py-8 text-slate-400">Belum ada anggota tim</div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {(m.user_name || 'U').charAt(0)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{m.user_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-400 capitalize">{m.role}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[m.status]}`}>
                {m.status === 'accepted' ? 'Aktif' : m.status === 'invited' ? 'Menunggu' : 'Ditolak'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentsTab({ assignments }: { assignments: Assignment[] }) {
  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    normal: 'bg-blue-500/20 text-blue-400',
    low: 'bg-slate-500/20 text-slate-400'
  };

  return (
    <div className="space-y-4">
      <h4 className="text-white font-medium">Penugasan ({assignments.length})</h4>
      {assignments.length === 0 ? (
        <div className="text-center py-8 text-slate-400">Belum ada penugasan</div>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => (
            <div key={a.id} className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-start justify-between mb-2">
                <p className="text-white text-sm font-medium">{a.report_name || a.report_description || 'Laporan'}</p>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[a.priority]}`}>
                  {a.priority}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>Ditugaskan ke: {a.assignee_name}</span>
                <span>Status: {a.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
