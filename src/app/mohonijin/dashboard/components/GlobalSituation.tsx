'use client';

import { useState, useEffect } from 'react';
import { Globe, AlertTriangle, Users, Building, TrendingUp, Clock, CheckCircle, Activity } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Stats {
  incidents: {
    total: number;
    open_count: number;
    in_review_count: number;
    resolved_count: number;
    last_24h: number;
    last_7d: number;
  };
  byDisasterType: { disaster_type: string; count: number }[];
  byProvince: { province: string; count: number }[];
  dailyTrend: { date: string; count: number; open_count: number; resolved_count: number }[];
  organizations: { total_orgs: number; active_orgs: number };
  responders: { total_responders: number; active_responders: number; on_duty_responders: number };
  assignments: { total_assignments: number; pending_assignments: number; active_assignments: number; completed_assignments: number };
}

function StatCard({ label, value, subValue, icon: Icon, color }: {
  label: string;
  value: number | string;
  subValue?: string;
  icon: React.ElementType;
  color: 'red' | 'orange' | 'green' | 'blue' | 'purple';
}) {
  const colorClasses = {
    red: 'text-red-400 bg-red-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    green: 'text-green-400 bg-green-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function GlobalSituation() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/mohonijin/global-stats');
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
      <div className="flex justify-center items-center py-12">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-xl">
          <Globe className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Global Situation</h2>
          <p className="text-xs text-slate-400">Cross-organization overview</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Incidents"
          value={stats.incidents.total}
          subValue={`${stats.incidents.last_24h} in last 24h`}
          icon={AlertTriangle}
          color="blue"
        />
        <StatCard
          label="Open Incidents"
          value={stats.incidents.open_count}
          subValue={`${stats.incidents.in_review_count} in review`}
          icon={Clock}
          color="red"
        />
        <StatCard
          label="Organizations"
          value={stats.organizations.active_orgs}
          subValue={`of ${stats.organizations.total_orgs} total`}
          icon={Building}
          color="purple"
        />
        <StatCard
          label="Active Responders"
          value={stats.responders.active_responders}
          subValue={`${stats.responders.on_duty_responders} on duty`}
          icon={Users}
          color="green"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Tasks"
          value={stats.assignments.pending_assignments}
          icon={Activity}
          color="orange"
        />
        <StatCard
          label="Active Tasks"
          value={stats.assignments.active_assignments}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          label="Completed Tasks"
          value={stats.assignments.completed_assignments}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Resolved (7d)"
          value={stats.incidents.last_7d}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
          <h3 className="text-lg font-bold text-white mb-4">14-Day Trend</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: stats.dailyTrend.map(d => new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })),
                datasets: [
                  {
                    label: 'New',
                    data: stats.dailyTrend.map(d => d.count),
                    backgroundColor: '#3b82f6',
                  },
                  {
                    label: 'Resolved',
                    data: stats.dailyTrend.map(d => d.resolved_count),
                    backgroundColor: '#22c55e',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                  x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                  y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                },
              }}
            />
          </div>
        </div>

        {/* By Disaster Type */}
        <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
          <h3 className="text-lg font-bold text-white mb-4">By Disaster Type</h3>
          <div className="space-y-2">
            {stats.byDisasterType.slice(0, 6).map((item, i) => (
              <div key={item.disaster_type} className="flex items-center justify-between">
                <span className="text-sm text-slate-300 capitalize">{item.disaster_type || 'Unknown'}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(item.count / stats.incidents.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-400 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By Province */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
        <h3 className="text-lg font-bold text-white mb-4">Top Provinces</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.byProvince.slice(0, 10).map((item) => (
            <div key={item.province} className="bg-slate-700/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-white">{item.count}</p>
              <p className="text-xs text-slate-400 truncate">{item.province.trim() || 'Unknown'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
