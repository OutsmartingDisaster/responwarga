'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Clock, User, Building, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Incident, IncidentStatus } from '@/types/incidents';

interface Assignment {
  id: string;
  responder_id: string;
  assignee_name: string;
  assignee_phone: string;
  assigner_name: string;
  status: string;
  priority: string;
  notes: string;
  assigned_at: string;
}

interface Responder {
  user_id: string;
  full_name: string;
  phone: string;
  organization_name: string;
  active_assignments: number;
}

interface IncidentDetail extends Incident {
  organization?: { id: string; name: string; slug: string };
  assignments: Assignment[];
}

interface Props {
  incident: Incident;
  onClose: () => void;
  onAssigned?: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    open: { label: 'Open', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
    in_review: { label: 'In Review', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    resolved: { label: 'Resolved', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
    assigned: { label: 'Assigned', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    in_progress: { label: 'In Progress', classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    completed: { label: 'Completed', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
    pending: { label: 'Pending', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  };
  const { label, classes } = config[status] || { label: status, classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${classes}`}>
      {label}
    </span>
  );
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
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function IncidentDetailModal({ incident, onClose, onAssigned }: Props) {
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedResponder, setSelectedResponder] = useState('');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchDetail();
    fetchResponders();
  }, [incident.id]);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/mohonijin/incidents/${incident.id}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setDetail(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponders = async () => {
    try {
      const res = await fetch('/api/mohonijin/responders');
      const result = await res.json();
      if (res.ok) setResponders(result.data || []);
    } catch (err) {
      console.error('Failed to fetch responders:', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedResponder) return;
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/mohonijin/incidents/${incident.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responder_id: selectedResponder, priority, notes }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      setShowAssignForm(false);
      setSelectedResponder('');
      setNotes('');
      fetchDetail();
      onAssigned?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Incident Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : error && !detail ? (
            <div className="text-red-400 text-center py-8">{error}</div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={detail.incident_status} />
                  <span className="text-xs text-slate-400 capitalize">{detail.source_type.replace('_', ' ')}</span>
                  {detail.disaster_type && (
                    <span className="text-xs text-slate-400 capitalize">• {detail.disaster_type}</span>
                  )}
                </div>
                
                <h3 className="text-white font-medium">
                  {detail.assistance_type || detail.disaster_type || 'Unknown incident'}
                </h3>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detail.location_name && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span>{detail.location_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>{getTimeAgo(detail.created_at)}</span>
                  </div>
                  {detail.organization && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Building className="w-4 h-4" />
                      <span>{detail.organization.name}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs font-mono text-slate-500">ID: {detail.id}</p>
              </div>

              {/* Assignments */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium">Assignments</h4>
                  {!showAssignForm && (
                    <button
                      onClick={() => setShowAssignForm(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Assign</span>
                    </button>
                  )}
                </div>

                {/* Assignment Form */}
                {showAssignForm && (
                  <div className="bg-slate-700/50 rounded-lg p-3 mb-4 space-y-3">
                    <select
                      value={selectedResponder}
                      onChange={(e) => setSelectedResponder(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select Responder</option>
                      {responders.map((r) => (
                        <option key={r.user_id} value={r.user_id}>
                          {r.full_name} ({r.organization_name || 'No org'}) - {r.active_assignments} active
                        </option>
                      ))}
                    </select>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="low">Low Priority</option>
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
                      rows={2}
                    />
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={handleAssign}
                        disabled={!selectedResponder || assigning}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
                      >
                        {assigning ? 'Assigning...' : 'Confirm Assignment'}
                      </button>
                      <button
                        onClick={() => setShowAssignForm(false)}
                        className="px-4 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Assignment List */}
                {detail.assignments.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No assignments yet</p>
                ) : (
                  <div className="space-y-2">
                    {detail.assignments.map((a) => (
                      <div key={a.id} className="bg-slate-700/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-white text-sm">{a.assignee_name || 'Unknown'}</span>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          <span>Assigned by {a.assigner_name} • {getTimeAgo(a.assigned_at)}</span>
                          {a.notes && <p className="mt-1 text-slate-500">Note: {a.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
