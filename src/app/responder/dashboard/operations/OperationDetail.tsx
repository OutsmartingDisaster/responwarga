'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, MapPin, AlertTriangle, CheckCircle2, Pause, Play, RefreshCw, Users, FileText, ClipboardList } from 'lucide-react';
import { DISASTER_TYPES, ResponseOperation, ResponseTeamMember, OperationStatus } from '@/types/operations';
import InviteMemberModal from './InviteMemberModal';
import OperationOverview from './components/OperationOverview';
import TeamMembersList from './components/TeamMembersList';
import ReportsInRadius from './components/ReportsInRadius';
import AssignReportModal from './components/AssignReportModal';

interface OperationDetailProps {
  operationId: string;
  onBack: () => void;
}

const STATUS_CONFIG: Record<OperationStatus, { color: string; label: string }> = {
  active: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Aktif' },
  completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Selesai' },
  suspended: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Ditunda' }
};

export default function OperationDetail({ operationId, onBack }: OperationDetailProps) {
  const [operation, setOperation] = useState<ResponseOperation | null>(null);
  const [teamMembers, setTeamMembers] = useState<ResponseTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'reports' | 'assignments'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const fetchOperation = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operations/${operationId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch');
      setOperation(result.data);
      setTeamMembers(result.data.team_members || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  useEffect(() => { fetchOperation(); }, [fetchOperation]);

  const handleStatusChange = async (newStatus: OperationStatus) => {
    if (!operation) return;
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/operations/${operationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setOperation(result.data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
    </div>;
  }

  if (error || !operation) {
    return (
      <div className="space-y-4">
        <BackButton onClick={onBack} />
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
          {error || 'Operasi tidak ditemukan'}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: AlertTriangle },
    { id: 'team', label: 'Tim', icon: Users },
    { id: 'reports', label: 'Laporan', icon: FileText },
    { id: 'assignments', label: 'Tugas', icon: ClipboardList }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <BackButton onClick={onBack} />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_CONFIG[operation.status].color}`}>
                {STATUS_CONFIG[operation.status].label}
              </span>
              <span className="px-2.5 py-1 bg-slate-700/50 rounded-lg text-xs font-medium text-slate-300">
                {DISASTER_TYPES[operation.disaster_type]}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">{operation.name}</h2>
            <div className="flex items-center gap-2 text-slate-400 mt-1">
              <MapPin className="w-4 h-4" />
              <span>{operation.disaster_location_name}</span>
            </div>
          </div>
        </div>
        <StatusActions operation={operation} onStatusChange={handleStatusChange} onRefresh={fetchOperation} updating={updatingStatus} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && <OperationOverview operation={operation} teamMembers={teamMembers} />}
      {activeTab === 'team' && <TeamMembersList teamMembers={teamMembers} onInvite={() => setShowInviteModal(true)} />}
      {activeTab === 'reports' && <ReportsInRadius operation={operation} onAssign={setSelectedReport} />}
      {activeTab === 'assignments' && <PlaceholderTab icon={ClipboardList} title="Tugas" />}

      {showInviteModal && (
        <InviteMemberModal
          operationId={operationId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => { setShowInviteModal(false); fetchOperation(); }}
        />
      )}

      {selectedReport && (
        <AssignReportModal
          operationId={operationId}
          report={selectedReport}
          teamMembers={teamMembers}
          onClose={() => setSelectedReport(null)}
          onSuccess={() => { setSelectedReport(null); fetchOperation(); }}
        />
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-2 hover:bg-slate-800 rounded-lg transition-colors mt-1">
      <ChevronLeft className="w-5 h-5 text-slate-400" />
    </button>
  );
}

function StatusActions({ operation, onStatusChange, onRefresh, updating }: {
  operation: ResponseOperation;
  onStatusChange: (status: OperationStatus) => void;
  onRefresh: () => void;
  updating: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onRefresh} className="p-2 hover:bg-slate-800 rounded-lg" title="Refresh">
        <RefreshCw className="w-5 h-5 text-slate-400" />
      </button>
      {operation.status === 'active' && (
        <>
          <button onClick={() => onStatusChange('suspended')} disabled={updating}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl">
            <Pause className="w-4 h-4" /><span>Tunda</span>
          </button>
          <button onClick={() => onStatusChange('completed')} disabled={updating}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl">
            <CheckCircle2 className="w-4 h-4" /><span>Selesai</span>
          </button>
        </>
      )}
      {operation.status === 'suspended' && (
        <button onClick={() => onStatusChange('active')} disabled={updating}
          className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl">
          <Play className="w-4 h-4" /><span>Aktifkan</span>
        </button>
      )}
    </div>
  );
}

function PlaceholderTab({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-white/5">
      <Icon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-slate-400">Fitur ini akan segera tersedia</p>
    </div>
  );
}
