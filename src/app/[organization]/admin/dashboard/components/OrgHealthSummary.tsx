'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface OrgStats {
  organization: { name: string; slug: string };
  incidents: {
    total: number;
    open_count: number;
    in_review_count: number;
    resolved_count: number;
    last_24h: number;
  };
  responders: {
    total_responders: number;
    active_responders: number;
    on_duty_responders: number;
  };
  assignments: {
    total_assignments: number;
    pending_assignments: number;
    active_assignments: number;
    completed_assignments: number;
    completed_7d: number;
  };
  dailyTrend: { date: string; count: number; resolved_count: number }[];
}

function StatCard({ label, value, subValue, icon: Icon, color }: {
  label: string; value: number | string; subValue?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function OrgHealthSummary({ organizationId }: { organizationId: string }) {
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/org/stats');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setStats(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
        {error || 'Failed to load stats'}
      </div>
    );
  }

  // Calculate health score
  let healthScore = 100;
  const flags: string[] = [];

  if (parseInt(String(stats.responders.active_responders)) === 0) {
    flags.push('No active responders');
    healthScore -= 30;
  }
  if (parseInt(String(stats.incidents.open_count)) > 10) {
    flags.push('High incident backlog');
    healthScore -= 20;
  }
  if (parseInt(String(stats.assignments.pending_assignments)) > parseInt(String(stats.responders.active_responders)) * 3) {
    flags.push('Tasks overloaded');
    healthScore -= 15;
  }

  const healthStatus = healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical';
  const healthColor = healthStatus === 'healthy' ? 'bg-green-500' : healthStatus === 'warning' ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Organization Health</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            healthStatus === 'healthy' ? 'bg-green-500/10 text-green-400' :
            healthStatus === 'warning' ? 'bg-orange-500/10 text-orange-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            {healthStatus}
          </span>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-400">Health Score</span>
            <span className="text-white font-bold">{Math.max(0, healthScore)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full ${healthColor} rounded-full transition-all`} style={{ width: `${Math.max(0, healthScore)}%` }} />
          </div>
        </div>

        {flags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {flags.map((flag, i) => (
              <span key={i} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">{flag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Incidents" value={stats.incidents.open_count} subValue={`${stats.incidents.last_24h} in 24h`} icon={AlertTriangle} color="bg-red-600" />
        <StatCard label="Active Responders" value={stats.responders.active_responders} subValue={`${stats.responders.on_duty_responders} on duty`} icon={Users} color="bg-green-600" />
        <StatCard label="Pending Tasks" value={stats.assignments.pending_assignments} icon={Clock} color="bg-orange-600" />
        <StatCard label="Completed (7d)" value={stats.assignments.completed_7d} icon={CheckCircle} color="bg-blue-600" />
      </div>

      {/* 7-Day Trend */}
      {stats.dailyTrend.length > 0 && (
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
          <h4 className="text-white font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> 7-Day Trend
          </h4>
          <div className="flex items-end gap-1 h-24">
            {stats.dailyTrend.map((day, i) => {
              const maxCount = Math.max(...stats.dailyTrend.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-slate-700 rounded-t relative" style={{ height: `${height}%`, minHeight: '4px' }}>
                    <div className="absolute bottom-0 w-full bg-blue-500 rounded-t" style={{ height: `${(day.resolved_count / Math.max(day.count, 1)) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500">{new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).charAt(0)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-700 rounded" /> New</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded" /> Resolved</span>
          </div>
        </div>
      )}
    </div>
  );
}
