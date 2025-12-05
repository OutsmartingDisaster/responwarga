'use client';

import { useState, useEffect } from 'react';
import { Shield, RefreshCw, Filter, User, Clock, FileText } from 'lucide-react';

interface AuditEntry {
  id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  ip_address: string;
  created_at: string;
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
  return date.toLocaleDateString();
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    create: 'bg-green-500/10 text-green-400 border-green-500/20',
    update: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    delete: 'bg-red-500/10 text-red-400 border-red-500/20',
    login: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    export: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  const actionType = action.split('_')[0];
  const colorClass = colors[actionType] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${colorClass}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');

  useEffect(() => {
    fetchEntries();
  }, [actionFilter, entityFilter]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/mohonijin/audit-log?${params}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setEntries(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Audit Log</h2>
            <p className="text-xs text-slate-400">Track admin actions and changes</p>
          </div>
        </div>
        <button
          onClick={fetchEntries}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">All Entities</option>
          <option value="organization">Organization</option>
          <option value="user">User</option>
          <option value="api_key">API Key</option>
          <option value="policy">Policy</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Log Table */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No audit entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(entry.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-white">{entry.user_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={entry.action} />
                    </td>
                    <td className="px-4 py-3">
                      {entry.entity_type && (
                        <div>
                          <span className="text-xs text-slate-400 capitalize">{entry.entity_type}</span>
                          {entry.entity_id && (
                            <code className="ml-2 text-[10px] font-mono text-slate-500">{entry.entity_id.slice(0, 8)}</code>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.details && (
                        <code className="text-[10px] font-mono text-slate-500 max-w-xs truncate block">
                          {JSON.stringify(entry.details).slice(0, 50)}...
                        </code>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
