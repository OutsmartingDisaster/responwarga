'use client';

import { Clock, CheckCircle2, MapPin, Building2, Users, FileText, ClipboardList } from 'lucide-react';
import { ResponseOperation, ResponseTeamMember, DISASTER_TYPES } from '@/types/operations';
import dynamic from 'next/dynamic';

const MiniMapPicker = dynamic(() => import('../MiniMapPicker'), { ssr: false });

interface OperationOverviewProps {
  operation: ResponseOperation;
  teamMembers: ResponseTeamMember[];
}

export default function OperationOverview({ operation, teamMembers }: OperationOverviewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const acceptedCount = teamMembers.filter(m => m.status === 'accepted').length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Info Card */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Informasi Operasi</h3>
        {operation.description && <p className="text-slate-400">{operation.description}</p>}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400">Dimulai:</span>
            <span className="text-white">{formatDate(operation.started_at)}</span>
          </div>
          {operation.ended_at && (
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
              <span className="text-slate-400">Selesai:</span>
              <span className="text-white">{formatDate(operation.ended_at)}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400">Radius:</span>
            <span className="text-white">{operation.disaster_radius_km} km</span>
          </div>
        </div>
      </div>

      {/* Posko Card */}
      {operation.posko_name && (
        <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" /> Posko
          </h3>
          <div className="space-y-2">
            <p className="text-white font-medium">{operation.posko_name}</p>
            {operation.posko_address && <p className="text-slate-400 text-sm">{operation.posko_address}</p>}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="lg:col-span-2 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Anggota Tim" value={acceptedCount} color="blue" />
        <StatCard icon={FileText} label="Laporan Lapangan" value={operation.field_reports_count || 0} color="green" />
        <StatCard icon={ClipboardList} label="Tugas" value={operation.assignments_count || 0} color="orange" />
      </div>

      {/* Map */}
      <div className="lg:col-span-2 bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Peta Lokasi</h3>
        <div className="h-80 rounded-xl overflow-hidden">
          <MiniMapPicker
            latitude={operation.disaster_lat}
            longitude={operation.disaster_lng}
            radius={operation.disaster_radius_km}
            onLocationChange={() => {}}
            markerColor="red"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400'
  };

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-5">
      <div className="flex items-center gap-3">
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
