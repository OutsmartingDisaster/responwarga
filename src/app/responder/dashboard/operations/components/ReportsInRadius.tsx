'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Clock, User, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { ResponseOperation } from '@/types/operations';

interface Report {
  id: string;
  type: 'emergency_report' | 'community_contribution';
  title?: string;
  description?: string;
  category?: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  reporter_name?: string;
  reporter_phone?: string;
  distance_km?: number;
  assignment_status?: string;
}

interface ReportsInRadiusProps {
  operation: ResponseOperation;
  onAssign: (report: Report) => void;
}

export default function ReportsInRadius({ operation, onAssign }: ReportsInRadiusProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          lat: operation.disaster_lat.toString(),
          lng: operation.disaster_lng.toString(),
          radius: operation.disaster_radius_km.toString(),
          operation_id: operation.id
        });
        
        const response = await fetch(`/api/operations/${operation.id}/nearby-reports?${params}`);
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Failed to fetch reports');
        setReports(result.data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [operation]);

  const filteredReports = reports.filter(r => {
    if (filter === 'unassigned') return !r.assignment_status;
    if (filter === 'assigned') return !!r.assignment_status;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>;
  }

  if (error) {
    return <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Laporan dalam Radius ({reports.length})
        </h3>
        <div className="flex items-center gap-2">
          {['all', 'unassigned', 'assigned'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
              }`}>
              {f === 'all' ? 'Semua' : f === 'unassigned' ? 'Belum Ditugaskan' : 'Sudah Ditugaskan'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filteredReports.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid gap-3">
          {filteredReports.map(report => (
            <ReportCard key={report.id} report={report} onAssign={() => onAssign(report)} />
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
        {filter === 'unassigned' ? 'Tidak ada laporan yang belum ditugaskan' : 
         filter === 'assigned' ? 'Tidak ada laporan yang sudah ditugaskan' : 
         'Tidak ada laporan dalam radius'}
      </h3>
      <p className="text-slate-400">Laporan akan muncul di sini saat ada yang masuk dalam radius operasi</p>
    </div>
  );
}

function ReportCard({ report, onAssign }: { report: Report; onAssign: () => void }) {
  const isAssigned = !!report.assignment_status;
  
  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Type & Status */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              report.type === 'emergency_report' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {report.type === 'emergency_report' ? 'Darurat' : 'Kontribusi'}
            </span>
            {report.category && (
              <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300">{report.category}</span>
            )}
            {isAssigned && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ditugaskan
              </span>
            )}
          </div>

          {/* Title/Description */}
          <p className="text-white font-medium mb-2 line-clamp-2">
            {report.title || report.description || 'Tidak ada deskripsi'}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            {report.distance_km !== undefined && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {report.distance_km.toFixed(1)} km
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(report.created_at).toLocaleDateString('id-ID')}
            </span>
            {report.reporter_name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {report.reporter_name}
              </span>
            )}
          </div>
        </div>

        {/* Action */}
        {!isAssigned && (
          <button onClick={onAssign}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors">
            <UserPlus className="w-4 h-4" /> Tugaskan
          </button>
        )}
      </div>
    </div>
  );
}
