'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, MapPin, Clock, AlertTriangle, UserPlus, Filter, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AssignReportToTeamModal from './AssignReportToTeamModal';

interface EmergencyReport {
  id: string;
  full_name: string;
  phone_number?: string;
  description: string;
  disaster_type?: string;
  assistance_type?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  dispatch_status: string;
  created_at: string;
  photo_url?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  verified: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  resolved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400'
};

const DISPATCH_COLORS: Record<string, string> = {
  unassigned: 'bg-slate-500/20 text-slate-400',
  assigned: 'bg-blue-500/20 text-blue-400',
  dispatched: 'bg-orange-500/20 text-orange-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  resolved: 'bg-green-500/20 text-green-400'
};

export default function ReportsTab({ organizationId }: { organizationId: string }) {
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned' | 'resolved'>('all');
  const [selectedReport, setSelectedReport] = useState<EmergencyReport | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/admin/emergency-reports';
      if (filter !== 'all') {
        url += `?dispatch_status=${filter}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setReports(result.data || []);
    } catch (err: any) {
      toast.error('Gagal memuat laporan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleAssign = (report: EmergencyReport) => {
    setSelectedReport(report);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedReport(null);
    fetchReports();
    toast.success('Laporan berhasil ditugaskan');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" /> Laporan Darurat
          </h3>
          <p className="text-sm text-slate-400 mt-1">Kelola dan tugaskan laporan ke tim responder</p>
        </div>
        <button onClick={fetchReports} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        {(['all', 'unassigned', 'assigned', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}>
            {f === 'all' ? 'Semua' : f === 'unassigned' ? 'Belum Ditugaskan' : f === 'assigned' ? 'Ditugaskan' : 'Selesai'}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-white/5">
          <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Tidak ada laporan</h3>
          <p className="text-slate-400">Belum ada laporan darurat yang masuk</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <ReportCard key={report.id} report={report} onAssign={() => handleAssign(report)} />
          ))}
        </div>
      )}

      {showAssignModal && selectedReport && (
        <AssignReportToTeamModal
          report={selectedReport}
          onClose={() => { setShowAssignModal(false); setSelectedReport(null); }}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}

function ReportCard({ report, onAssign }: { report: EmergencyReport; onAssign: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800/50 border border-white/5 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[report.status] || STATUS_COLORS.pending}`}>
                {report.status}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${DISPATCH_COLORS[report.dispatch_status] || DISPATCH_COLORS.unassigned}`}>
                {report.dispatch_status === 'unassigned' ? 'Belum Ditugaskan' : report.dispatch_status}
              </span>
              {report.disaster_type && (
                <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300">{report.disaster_type}</span>
              )}
            </div>
            <h4 className="text-white font-medium mb-1">{report.full_name}</h4>
            <p className="text-sm text-slate-400 line-clamp-2">{report.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              {report.address && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {report.address}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(report.created_at).toLocaleDateString('id-ID')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
              <Eye className="w-4 h-4" />
            </button>
            {report.dispatch_status === 'unassigned' && (
              <button onClick={onAssign}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
                <UserPlus className="w-3 h-3" /> Tugaskan
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Telepon:</span>
              <span className="text-white ml-2">{report.phone_number || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400">Jenis Bantuan:</span>
              <span className="text-white ml-2">{report.assistance_type || '-'}</span>
            </div>
            {report.latitude && report.longitude && (
              <div className="col-span-2">
                <span className="text-slate-400">Koordinat:</span>
                <span className="text-white ml-2">{report.latitude}, {report.longitude}</span>
              </div>
            )}
          </div>
          {report.photo_url && (
            <div className="mt-3">
              <img src={report.photo_url} alt="Foto Laporan" className="w-full max-w-xs rounded-lg" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
