'use client';

import React, { useState, useEffect } from 'react';
import { FileText, MapPin, Clock, Filter, Loader2, AlertTriangle } from 'lucide-react';

interface Report {
  id: string;
  description: string;
  category: string;
  status: string;
  dispatch_status: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  reporter_name?: string;
  organization_name?: string;
}

export default function AllReportsView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'dispatched'>('all');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const params = filter !== 'all' ? `?status=${filter}` : '';
        const response = await fetch(`/api/mohonijin/reports${params}`);
        const result = await response.json();
        setReports(result.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [filter]);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    verified: 'bg-green-500/20 text-green-400',
    dispatched: 'bg-blue-500/20 text-blue-400',
    resolved: 'bg-slate-500/20 text-slate-400'
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Semua Laporan ({reports.length})</h3>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={filter} onChange={e => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500">
            <option value="all">Semua</option>
            <option value="pending">Pending</option>
            <option value="verified">Terverifikasi</option>
            <option value="dispatched">Dispatched</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-white/5">
          <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="bg-slate-800/40 border border-white/5 rounded-xl p-4 hover:bg-slate-800/60 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[report.status] || statusColors.pending}`}>
                      {report.status}
                    </span>
                    {report.category && (
                      <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300">{report.category}</span>
                    )}
                  </div>
                  <p className="text-white font-medium line-clamp-2">{report.description || 'Tidak ada deskripsi'}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleString('id-ID')}
                    </span>
                    {report.organization_name && <span>{report.organization_name}</span>}
                    {report.latitude && report.longitude && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
