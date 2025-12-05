'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, MapPin, Users, FileText, ClipboardList, Plus, Loader2 } from 'lucide-react';
import { DISASTER_TYPES, ResponseOperation, DisasterType } from '@/types/operations';
import dynamic from 'next/dynamic';
import FieldReportsList from './components/FieldReportsList';

const FieldReportForm = dynamic(() => import('./components/FieldReportForm'), { ssr: false });

interface MyOperationDetailProps {
  operationId: string;
  onBack: () => void;
}

export default function MyOperationDetail({ operationId, onBack }: MyOperationDetailProps) {
  const [operation, setOperation] = useState<ResponseOperation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'reports'>('overview');

  const fetchOperation = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operations/${operationId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setOperation(result.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  useEffect(() => { fetchOperation(); }, [fetchOperation]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  
  if (error || !operation) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" /> Kembali
        </button>
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">{error || 'Operasi tidak ditemukan'}</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'assignments', label: 'Tugas Saya', icon: ClipboardList },
    { id: 'reports', label: 'Laporan', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg mt-1">
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">Bergabung</span>
            <span className="px-2.5 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-300">{DISASTER_TYPES[operation.disaster_type]}</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{operation.name}</h2>
          <div className="flex items-center gap-2 text-slate-400 mt-1">
            <MapPin className="w-4 h-4" />
            <span>{operation.disaster_location_name}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && <OverviewTab operation={operation} />}
      {activeTab === 'assignments' && <AssignmentsTab operationId={operationId} />}
      {activeTab === 'reports' && <ReportsTab operationId={operationId} disasterType={operation.disaster_type} />}
    </div>
  );
}

function OverviewTab({ operation }: { operation: ResponseOperation }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Informasi Operasi</h3>
        {operation.description && <p className="text-slate-400 mb-4">{operation.description}</p>}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Radius</span><span className="text-white">{operation.disaster_radius_km} km</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Dimulai</span><span className="text-white">{new Date(operation.started_at).toLocaleDateString('id-ID')}</span></div>
        </div>
      </div>
      {operation.posko_name && (
        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Posko</h3>
          <p className="text-white font-medium">{operation.posko_name}</p>
          {operation.posko_address && <p className="text-slate-400 text-sm mt-1">{operation.posko_address}</p>}
        </div>
      )}
    </div>
  );
}

function AssignmentsTab({ operationId }: { operationId: string }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response = await fetch(`/api/my-assignments?operation_id=${operationId}`);
        const result = await response.json();
        setAssignments(result.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [operationId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-white/5">
        <ClipboardList className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Belum ada tugas</h3>
        <p className="text-slate-400">Tugas akan muncul di sini saat Anda ditugaskan</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map(a => (
        <div key={a.id} className="bg-slate-800/40 border border-white/5 rounded-xl p-4">
          <p className="text-white font-medium">{a.report_description || 'Tugas'}</p>
          <p className="text-sm text-slate-400 mt-1">Status: {a.status}</p>
        </div>
      ))}
    </div>
  );
}

function ReportsTab({ operationId, disasterType }: { operationId: string; disasterType: DisasterType }) {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [hasReports, setHasReports] = useState<boolean | null>(null);

  const handleSuccess = () => {
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Laporan Lapangan</h3>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
          <Plus className="w-4 h-4" /> Buat Laporan
        </button>
      </div>

      <FieldReportsList operationId={operationId} refreshTrigger={refreshTrigger} />

      {showForm && (
        <FieldReportForm
          operationId={operationId}
          disasterType={disasterType}
          onClose={() => setShowForm(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
