'use client';

import React, { useState, useEffect } from 'react';
import { Building2, FileText, Radio, Users, TrendingUp, AlertTriangle, Clock, MapPin } from 'lucide-react';

interface Stats {
  organizations: number;
  totalReports: number;
  activeOperations: number;
  totalResponders: number;
}

interface RecentReport {
  id: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
}

export default function SuperAdminOverview({ stats }: { stats: Stats }) {
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const response = await fetch('/api/super-admin/reports?limit=10');
        const result = await response.json();
        setRecentReports(result.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, []);

  return (
    <div className="space-y-6 pb-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Organisasi" value={stats.organizations} color="purple" />
        <StatCard icon={FileText} label="Total Laporan" value={stats.totalReports} color="blue" />
        <StatCard icon={Radio} label="Operasi Aktif" value={stats.activeOperations} color="green" />
        <StatCard icon={Users} label="Total Responder" value={stats.totalResponders} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" /> Laporan Terbaru
          </h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500" />
            </div>
          ) : recentReports.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Belum ada laporan</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentReports.map(report => (
                <div key={report.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      report.status === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'
                    }`}>{report.status}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <p className="text-white text-sm line-clamp-2">{report.description || 'Tidak ada deskripsi'}</p>
                  {report.category && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300">{report.category}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" /> Ringkasan Sistem
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
              <span className="text-slate-400">Laporan Hari Ini</span>
              <span className="text-white font-bold">-</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
              <span className="text-slate-400">Operasi Minggu Ini</span>
              <span className="text-white font-bold">-</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
              <span className="text-slate-400">Responder Online</span>
              <span className="text-white font-bold">-</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
              <span className="text-slate-400">Rata-rata Waktu Respon</span>
              <span className="text-white font-bold">-</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400'
  };

  return (
    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
