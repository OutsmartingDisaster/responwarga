'use client';

import { useState, useEffect } from 'react';
import { X, Radio, Users, MapPin, Building2, Clock, CheckCircle, AlertTriangle, User, Phone, Navigation } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  role: string;
  profile_role: string;
  status: string;
  joined_at: string;
}

interface Assignment {
  id: string;
  report_id: string;
  report_name: string;
  report_description: string;
  assistance_type: string;
  report_lat: number;
  report_lng: number;
  assignee_name: string;
  status: string;
  assigned_at: string;
}

interface OperationDetail {
  id: string;
  name: string;
  description: string;
  disaster_type: string;
  status: string;
  organization_name: string;
  organization_slug: string;
  disaster_location_name: string;
  disaster_lat: number;
  disaster_lng: number;
  disaster_radius_km: number;
  posko_name: string;
  posko_address: string;
  posko_lat: number;
  posko_lng: number;
  created_by_name: string;
  created_at: string;
  team: TeamMember[];
  assignments: Assignment[];
  stats: {
    total_team: number;
    active_team: number;
    total_assignments: number;
    completed_assignments: number;
    active_assignments: number;
  };
}

interface Props {
  operationId: string;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  suspended: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  archived: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  accepted: 'bg-green-500/10 text-green-400 border-green-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function OperationDetailModal({ operationId, onClose }: Props) {
  const [data, setData] = useState<OperationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'assignments'>('overview');

  useEffect(() => {
    fetchDetail();
  }, [operationId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/mohonijin/operations/${operationId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!data) return null;

  const completionRate = data.stats.total_assignments > 0
    ? Math.round((data.stats.completed_assignments / data.stats.total_assignments) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${STATUS_COLORS[data.status]}`}>
                  {data.status}
                </span>
                <span className="text-xs text-slate-500">{data.disaster_type}</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{data.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" /> {data.organization_name}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {data.disaster_location_name}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-4 bg-slate-800/30 border-b border-white/5 grid grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-white">{data.stats.active_team}</p>
            <p className="text-[10px] text-slate-400 uppercase">Tim Aktif</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{data.stats.total_assignments}</p>
            <p className="text-[10px] text-slate-400 uppercase">Total Tugas</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-400">{data.stats.active_assignments}</p>
            <p className="text-[10px] text-slate-400 uppercase">Sedang Dikerjakan</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-400">{data.stats.completed_assignments}</p>
            <p className="text-[10px] text-slate-400 uppercase">Selesai</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-purple-400">{completionRate}%</p>
            <p className="text-[10px] text-slate-400 uppercase">Progress</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-white/5">
          <div className="flex gap-4">
            {(['overview', 'team', 'assignments'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}>
                {tab === 'overview' && 'Ringkasan'}
                {tab === 'team' && `Tim (${data.team.length})`}
                {tab === 'assignments' && `Penugasan (${data.assignments.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {data.description && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Deskripsi</h4>
                  <p className="text-white">{data.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-800/30 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Lokasi Bencana
                  </h4>
                  <p className="text-white font-medium">{data.disaster_location_name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.disaster_lat?.toFixed(6)}, {data.disaster_lng?.toFixed(6)}
                  </p>
                  <p className="text-xs text-slate-500">Radius: {data.disaster_radius_km} km</p>
                  <a href={`https://www.google.com/maps?q=${data.disaster_lat},${data.disaster_lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:underline">
                    <Navigation className="w-3 h-3" /> Buka di Maps
                  </a>
                </div>

                {data.posko_name && (
                  <div className="bg-slate-800/30 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Posko
                    </h4>
                    <p className="text-white font-medium">{data.posko_name}</p>
                    <p className="text-xs text-slate-500 mt-1">{data.posko_address}</p>
                    {data.posko_lat && (
                      <a href={`https://www.google.com/maps?q=${data.posko_lat},${data.posko_lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:underline">
                        <Navigation className="w-3 h-3" /> Buka di Maps
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-slate-800/30 rounded-xl p-4">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Info Operasi</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Dibuat oleh:</span>
                    <span className="text-white ml-2">{data.created_by_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tanggal dibuat:</span>
                    <span className="text-white ml-2">{new Date(data.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-3">
              {data.team.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada anggota tim</p>
                </div>
              ) : (
                data.team.map(member => (
                  <div key={member.id} className="bg-slate-800/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{member.full_name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="capitalize">{member.role || member.profile_role}</span>
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {member.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${STATUS_COLORS[member.status]}`}>
                      {member.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-3">
              {data.assignments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada penugasan</p>
                </div>
              ) : (
                data.assignments.map(assignment => (
                  <div key={assignment.id} className="bg-slate-800/30 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${STATUS_COLORS[assignment.status]}`}>
                            {assignment.status}
                          </span>
                          <span className="text-xs text-slate-500">{assignment.assistance_type}</span>
                        </div>
                        <p className="text-white font-medium">{assignment.report_name}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{assignment.report_description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>Ditugaskan ke: <span className="text-slate-300">{assignment.assignee_name}</span></span>
                          <span>{new Date(assignment.assigned_at).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                      {assignment.report_lat && (
                        <a href={`https://www.google.com/maps?q=${assignment.report_lat},${assignment.report_lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                          <Navigation className="w-4 h-4 text-blue-400" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
