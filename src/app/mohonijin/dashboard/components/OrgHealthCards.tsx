'use client';

import { useState, useEffect } from 'react';
import { Building, Users, AlertTriangle, CheckCircle, Clock, Activity, RefreshCw } from 'lucide-react';

interface OrgHealth {
  id: string;
  name: string;
  slug: string;
  status: string;
  metrics: {
    total_responders: number;
    active_responders: number;
    open_tasks: number;
    completed_7d: number;
    incident_backlog: number;
    active_operations: number;
  };
  last_activity: string | null;
  health_score: number;
  health_status: 'healthy' | 'warning' | 'critical';
  flags: string[];
}

interface Summary {
  total_orgs: number;
  healthy: number;
  warning: number;
  critical: number;
}

function getTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function HealthBadge({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const config = {
    healthy: { label: 'Healthy', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
    warning: { label: 'Warning', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    critical: { label: 'Critical', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const { label, classes } = config[status];

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${classes}`}>
      {label}
    </span>
  );
}

function FlagBadge({ flag }: { flag: string }) {
  const labels: Record<string, string> = {
    no_active_responders: 'No Responders',
    high_backlog: 'High Backlog',
    overloaded: 'Overloaded',
    inactive: 'Inactive',
    no_activity: 'No Activity',
  };

  return (
    <span className="px-2 py-0.5 bg-slate-600/50 rounded text-[10px] text-slate-300">
      {labels[flag] || flag}
    </span>
  );
}

function OrgCard({ org }: { org: OrgHealth }) {
  return (
    <div className={`bg-slate-800/40 backdrop-blur-md border rounded-2xl p-4 transition-all hover:bg-slate-800/60 ${
      org.health_status === 'critical' ? 'border-red-500/30' :
      org.health_status === 'warning' ? 'border-orange-500/30' :
      'border-white/5'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-white font-medium">{org.name}</h4>
          <p className="text-xs text-slate-500">/{org.slug}</p>
        </div>
        <HealthBadge status={org.health_status} />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-white">{org.metrics.active_responders}</p>
          <p className="text-[10px] text-slate-400">Responders</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-white">{org.metrics.open_tasks}</p>
          <p className="text-[10px] text-slate-400">Open Tasks</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-white">{org.metrics.incident_backlog}</p>
          <p className="text-[10px] text-slate-400">Backlog</p>
        </div>
      </div>

      {/* Health Score Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-400">Health Score</span>
          <span className="text-white font-medium">{org.health_score}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              org.health_score >= 75 ? 'bg-green-500' :
              org.health_score >= 50 ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${org.health_score}%` }}
          />
        </div>
      </div>

      {/* Flags */}
      {org.flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {org.flags.map(flag => <FlagBadge key={flag} flag={flag} />)}
        </div>
      )}

      {/* Last Activity */}
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Clock className="w-3 h-3" />
        <span>Last activity: {getTimeAgo(org.last_activity)}</span>
      </div>
    </div>
  );
}

export default function OrgHealthCards() {
  const [data, setData] = useState<{ summary: Summary; organizations: OrgHealth[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mohonijin/org-health');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgs = data?.organizations.filter(org => 
    filter === 'all' || org.health_status === filter
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl">
            <Building className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Organization Health</h2>
            <p className="text-xs text-slate-400">Monitor organization status and performance</p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-xl transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`bg-slate-800/40 border rounded-xl p-3 text-center transition-all ${
              filter === 'all' ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/5 hover:border-white/20'
            }`}
          >
            <p className="text-2xl font-bold text-white">{data.summary.total_orgs}</p>
            <p className="text-xs text-slate-400">Total</p>
          </button>
          <button
            onClick={() => setFilter('healthy')}
            className={`bg-slate-800/40 border rounded-xl p-3 text-center transition-all ${
              filter === 'healthy' ? 'border-green-500/50 bg-green-500/10' : 'border-white/5 hover:border-white/20'
            }`}
          >
            <p className="text-2xl font-bold text-green-400">{data.summary.healthy}</p>
            <p className="text-xs text-slate-400">Healthy</p>
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`bg-slate-800/40 border rounded-xl p-3 text-center transition-all ${
              filter === 'warning' ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/5 hover:border-white/20'
            }`}
          >
            <p className="text-2xl font-bold text-orange-400">{data.summary.warning}</p>
            <p className="text-xs text-slate-400">Warning</p>
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`bg-slate-800/40 border rounded-xl p-3 text-center transition-all ${
              filter === 'critical' ? 'border-red-500/50 bg-red-500/10' : 'border-white/5 hover:border-white/20'
            }`}
          >
            <p className="text-2xl font-bold text-red-400">{data.summary.critical}</p>
            <p className="text-xs text-slate-400">Critical</p>
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Organization Cards Grid */}
      {filteredOrgs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map(org => <OrgCard key={org.id} org={org} />)}
        </div>
      )}

      {filteredOrgs.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-400">
          <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No organizations found</p>
        </div>
      )}
    </div>
  );
}
