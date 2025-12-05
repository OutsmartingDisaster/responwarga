'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, Clock, Activity } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_hour: number;
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  expires_at: string | null;
  created_at: string;
  organization_id: string | null;
  organization_name: string | null;
  created_by_name: string | null;
}

interface Organization {
  id: string;
  name: string;
}

function getTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
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

export default function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formOrgId, setFormOrgId] = useState('');
  const [formScopes, setFormScopes] = useState<string[]>(['read_org_data']);
  const [formRateLimit, setFormRateLimit] = useState(1000);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApiKeys();
    fetchOrganizations();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mohonijin/api-keys');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setApiKeys(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', table: 'organizations', columns: 'id, name' })
      });
      const result = await res.json();
      if (res.ok) setOrganizations(result.data || []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/mohonijin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          organization_id: formOrgId || null,
          scopes: formScopes,
          rate_limit_per_hour: formRateLimit
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setNewKeyRevealed(result.data.key);
      setShowCreateForm(false);
      setFormName('');
      setFormOrgId('');
      setFormScopes(['read_org_data']);
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/mohonijin/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/mohonijin/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setFormScopes(prev => 
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl">
            <Key className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">API Keys</h2>
            <p className="text-xs text-slate-400">Manage API keys for partner data access</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Key
        </button>
      </div>

      {/* New Key Revealed */}
      {newKeyRevealed && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-400 font-medium">API Key Created!</p>
              <p className="text-xs text-slate-400 mt-1">Copy this key now. It will not be shown again.</p>
              <div className="flex items-center gap-2 mt-3">
                <code className="flex-1 bg-slate-800 px-3 py-2 rounded-lg text-sm font-mono text-white overflow-x-auto">
                  {newKeyRevealed}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeyRevealed)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              <button
                onClick={() => setNewKeyRevealed(null)}
                className="mt-3 text-xs text-slate-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
          <h3 className="text-lg font-bold text-white mb-4">Create New API Key</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Partner Integration Key"
                className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Organization (optional)</label>
              <select
                value={formOrgId}
                onChange={(e) => setFormOrgId(e.target.value)}
                className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Global (all organizations)</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Scopes</label>
              <div className="flex flex-wrap gap-2">
                {['read_org_data', 'read_aggregated_data', 'read_public_data'].map(scope => (
                  <button
                    key={scope}
                    onClick={() => toggleScope(scope)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      formScopes.includes(scope)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {scope.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Rate Limit (per hour)</label>
              <select
                value={formRateLimit}
                onChange={(e) => setFormRateLimit(parseInt(e.target.value))}
                className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1,000</option>
                <option value={5000}>5,000</option>
                <option value={10000}>10,000</option>
              </select>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!formName.trim() || creating}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
              >
                {creating ? 'Creating...' : 'Create API Key'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
        <h3 className="text-lg font-bold text-white mb-4">Active Keys</h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : apiKeys.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No API keys created yet</p>
        ) : (
          <div className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="bg-slate-700/30 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{key.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        key.is_active 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <code className="text-xs font-mono text-slate-400 mt-1 block">{key.key_prefix}...</code>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      {key.organization_name && (
                        <span>Org: {key.organization_name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {key.usage_count} requests
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last used: {getTimeAgo(key.last_used_at)}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {key.scopes.map(scope => (
                        <span key={scope} className="px-2 py-0.5 bg-slate-600/50 rounded text-[10px] text-slate-300">
                          {scope.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(key.id, key.is_active)}
                      className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                      title={key.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <AlertTriangle className={`w-4 h-4 ${key.is_active ? 'text-yellow-400' : 'text-green-400'}`} />
                    </button>
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Revoke"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
