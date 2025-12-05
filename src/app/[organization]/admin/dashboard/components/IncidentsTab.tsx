'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, MapPin, Filter, RefreshCw, Send, User, X } from 'lucide-react';

interface Incident {
  id: string;
  source_type: string;
  disaster_type: string | null;
  assistance_type: string | null;
  incident_status: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  created_at: string;
}

interface Responder {
  user_id: string;
  full_name: string;
  phone: string;
  status: string;
  active_assignments: number;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    open: { label: 'Open', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
    in_review: { label: 'In Review', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    resolved: { label: 'Resolved', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
  };
  const { label, classes } = config[status] || { label: status, classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${classes}`}>{label}</span>;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function IncidentsTab({ organizationId }: { organizationId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedResponder, setSelectedResponder] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidents();
    fetchResponders();
  }, [statusFilter]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      
      const res = await fetch(`/api/org/incidents?${params}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setIncidents(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponders = async () => {
    try {
      const res = await fetch('/api/org/responders');
      const result = await res.json();
      if (res.ok) setResponders(result.data || []);
    } catch (err) {
      console.error('Failed to fetch responders:', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedIncident || !selectedResponder) return;
    setAssigning(true);
    setError(null);

    try {
      const res = await fetch(`/api/mohonijin/incidents/${selectedIncident.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responder_id: selectedResponder,
          priority: 'normal',
          notes: assignNotes
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setSelectedIncident(null);
      setSelectedResponder('');
      setAssignNotes('');
      fetchIncidents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  // Stats
  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.incident_status === 'open').length,
    inReview: incidents.filter(i => i.incident_status === 'in_review').length,
    resolved: incidents.filter(i => i.incident_status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.open}</p>
          <p className="text-xs text-slate-400">Open</p>
        </div>
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{stats.inReview}</p>
          <p className="text-xs text-slate-400">In Review</p>
        </div>
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
          <p className="text-xs text-slate-400">Resolved</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          onClick={fetchIncidents}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Incident List */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No incidents found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {incidents.map(incident => (
              <div
                key={incident.id}
                className="p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={incident.incident_status} />
                      <span className="text-xs text-slate-500 capitalize">{incident.source_type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-white">
                      {incident.assistance_type || incident.disaster_type || 'Unknown incident'}
                    </p>
                    {incident.location_name && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {incident.location_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{getTimeAgo(incident.created_at)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedIncident(incident); }}
                      className="mt-2 flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30"
                    >
                      <Send className="w-3 h-3" />
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedIncident(null)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Assign Responder</h3>
              <button onClick={() => setSelectedIncident(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-white">{selectedIncident.assistance_type || selectedIncident.disaster_type}</p>
              <p className="text-xs text-slate-400 mt-1">{selectedIncident.location_name || 'No location'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Select Responder</label>
                <select
                  value={selectedResponder}
                  onChange={(e) => setSelectedResponder(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Choose responder...</option>
                  {responders.map(r => (
                    <option key={r.user_id} value={r.user_id}>
                      {r.full_name} ({r.active_assignments} active)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Notes (optional)</label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
                  rows={2}
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={handleAssign}
                disabled={!selectedResponder || assigning}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg transition-colors"
              >
                {assigning ? 'Assigning...' : 'Assign Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
