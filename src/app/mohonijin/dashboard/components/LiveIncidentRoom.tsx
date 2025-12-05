'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, CheckCircle, MapPin, Radio, Filter, RefreshCw, Map } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import for map to avoid SSR issues
const IncidentMiniMap = dynamic(() => import('./IncidentMiniMap'), { 
  ssr: false,
  loading: () => (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 h-[300px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
});
import IncidentDetailModal from './IncidentDetailModal';
import type { Incident, IncidentStatus, IncidentSourceType } from '@/types/incidents';

// Stats card component
function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: number | string; 
  icon: React.ElementType; 
  color: 'red' | 'orange' | 'green' | 'blue' | 'purple';
}) {
  const colorClasses = {
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 hover:bg-slate-800/60 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: IncidentStatus }) {
  const config = {
    open: { label: 'Open', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
    in_review: { label: 'In Review', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    resolved: { label: 'Resolved', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
  };
  const { label, classes } = config[status] || config.open;

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${classes}`}>
      {label}
    </span>
  );
}

// Source badge component
function SourceBadge({ source }: { source: IncidentSourceType }) {
  const config = {
    emergency_report: { label: 'Emergency', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
    crowdsource_submission: { label: 'Crowdsource', classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  };
  const { label, classes } = config[source] || { label: source, classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${classes}`}>
      {label}
    </span>
  );
}

// Incident row component
function IncidentRow({ incident, onClick }: { incident: Incident; onClick?: () => void }) {
  const timeAgo = getTimeAgo(incident.created_at);

  return (
    <div 
      onClick={onClick}
      className="bg-slate-800/30 border border-white/5 rounded-xl p-3 hover:bg-slate-800/50 hover:border-white/10 transition-all cursor-pointer">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SourceBadge source={incident.source_type} />
            <StatusBadge status={incident.incident_status} />
            {incident.disaster_type && (
              <span className="text-xs text-slate-400 capitalize">{incident.disaster_type}</span>
            )}
          </div>
          <p className="text-sm text-white mt-2 truncate">
            {incident.assistance_type || incident.disaster_type || 'Unknown incident'}
          </p>
          {incident.location_name && (
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{incident.location_name}</span>
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400">{timeAgo}</p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">{incident.id.slice(0, 8)}</p>
        </div>
      </div>
    </div>
  );
}

// Helper to format time ago
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function LiveIncidentRoom() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<IncidentSourceType | 'all'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('sourceType', sourceFilter);
      params.set('limit', '100');

      const response = await fetch(`/api/mohonijin/incidents?${params}`);
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to fetch incidents');

      setIncidents(result.data || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Compute stats
  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.incident_status === 'open').length,
    inReview: incidents.filter(i => i.incident_status === 'in_review').length,
    resolved: incidents.filter(i => i.incident_status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-xl">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Live Incident Room</h2>
            <p className="text-xs text-slate-400">
              {lastUpdated ? `Updated ${getTimeAgo(lastUpdated.toISOString())}` : 'Loading...'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchIncidents}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Incidents" value={stats.total} icon={AlertTriangle} color="blue" />
        <StatCard label="Open" value={stats.open} icon={AlertTriangle} color="red" />
        <StatCard label="In Review" value={stats.inReview} icon={Clock} color="orange" />
        <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle} color="green" />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">Filters:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | 'all')}
          className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as IncidentSourceType | 'all')}
          className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Sources</option>
          <option value="emergency_report">Emergency Reports</option>
          <option value="crowdsource_submission">Crowdsource</option>
        </select>
        </div>
        <button
          onClick={() => setShowMap(!showMap)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${showMap ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-white/10'}`}
        >
          <Map className="w-4 h-4" />
          <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Map and List Grid */}
      <div className={`grid gap-6 ${showMap ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Map Widget */}
        {showMap && (
          <IncidentMiniMap incidents={incidents} height="400px" />
        )}

        {/* Incident List */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
        <h3 className="text-lg font-bold text-white mb-4">Recent Incidents</h3>
        
        {loading && incidents.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No incidents found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
            {incidents.map((incident) => (
              <IncidentRow 
                key={incident.id} 
                incident={incident} 
                onClick={() => setSelectedIncident(incident)}
              />
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onAssigned={fetchIncidents}
        />
      )}
    </div>
  );
}
