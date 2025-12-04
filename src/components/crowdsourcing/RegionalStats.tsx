'use client';

import { MapPin, Camera, Video, TrendingUp } from 'lucide-react';

interface RegionStat {
  region_name: string;
  region_level: string;
  total_submissions: number;
  photo_count: number;
  video_count: number;
  approved_count: number;
  pending_count: number;
}

interface RegionalStatsProps {
  stats: RegionStat[];
  onRegionClick?: (region: RegionStat) => void;
}

export default function RegionalStats({ stats, onRegionClick }: RegionalStatsProps) {
  if (!stats.length) return null;

  const total = stats.reduce((sum, s) => sum + s.total_submissions, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <TrendingUp size={18} /> Statistik Per Daerah
        </h3>
        <span className="text-sm text-slate-400">{total} total kontribusi</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <button key={i} onClick={() => onRegionClick?.(stat)}
            className="bg-slate-800/40 border border-white/5 rounded-xl p-4 text-left hover:border-white/20 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-white">{stat.region_name}</p>
                <p className="text-xs text-slate-400 capitalize">{stat.region_level}</p>
              </div>
              <MapPin size={16} className="text-blue-400" />
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-slate-300">
                <Camera size={14} className="text-blue-400" />
                {stat.photo_count}
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <Video size={14} className="text-purple-400" />
                {stat.video_count}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: `${(stat.total_submissions / Math.max(...stats.map(s => s.total_submissions))) * 100}%` }} />
            </div>
            
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>{stat.approved_count} disetujui</span>
              {stat.pending_count > 0 && <span className="text-orange-400">{stat.pending_count} pending</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
