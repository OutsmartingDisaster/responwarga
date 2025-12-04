'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Users, Loader2 } from 'lucide-react';
import { LiveMap } from '@/app/components/DashboardSharedUI';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  type: 'report' | 'operation' | 'responder';
  status?: string;
}

export default function LiveMapView() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ reports: 0, operations: 0, responders: 0 });

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const response = await fetch('/api/super-admin/map-data');
        const result = await response.json();
        setMarkers(result.markers || []);
        setStats(result.stats || { reports: 0, operations: 0, responders: 0 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMapData();
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Stats Bar */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white font-medium">{stats.reports}</span>
          <span className="text-slate-400 text-sm">Laporan</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-white font-medium">{stats.operations}</span>
          <span className="text-slate-400 text-sm">Operasi</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-white font-medium">{stats.responders}</span>
          <span className="text-slate-400 text-sm">Responder Online</span>
        </div>
      </div>

      {/* Map */}
      <div className="relative bg-slate-800/30 border border-white/5 rounded-3xl overflow-hidden h-[600px]">
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur p-4 rounded-xl border border-white/10 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400" /> Peta Live Indonesia
          </h3>
          <p className="text-xs text-slate-400">Real-time monitoring seluruh wilayah</p>
        </div>

        <LiveMap center={[106.8456, -6.2088]} zoom={5} markers={markers} />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Laporan
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Operasi
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Responder
          </div>
        </div>
      </div>
    </div>
  );
}
