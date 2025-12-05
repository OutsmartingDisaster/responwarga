'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check, Clock, Activity } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_hour: number;
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
}

function getTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export default function ApiKeysTab({ organizationId }: { organizationId: string }) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formName, setFormName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/org/api-keys');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setApiKeys(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/org/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setNewKeyRevealed(result.data.key);
      setShowCreateForm(false);
      setFormName('');
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/org/api-keys/${id}`, { method: 'DELETE' });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl">
            <Key className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">API Keys</h3>
            <p className="text-xs text-slate-400">Manage API access for your organization</p>
          </div>
        </div>
        <button onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl">
          <Plus className="w-4 h-4" /> Create Key
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
                <button onClick={() => copyToClipboard(newKeyRevealed)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              <button onClick={() => setNewKeyRevealed(null)} className="mt-3 text-xs text-slate-400 hover:text-white">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
          <h4 className="text-white font-medium mb-3">Create New API Key</h4>
          <div className="space-y-3">
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="Key name (e.g., Integration Key)"
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            <p className="text-xs text-slate-400">This key will have read-only access to your organization's data.</p>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!formName.trim() || creating}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg">
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => setShowCreateForm(false)}
                className="px-4 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : apiKeys.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No API keys created yet</p>
        ) : (
          <div className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{key.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        key.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <code className="text-xs font-mono text-slate-400 mt-1 block">{key.key_prefix}...</code>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" /> {key.usage_count} requests
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last: {getTimeAgo(key.last_used_at)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleRevoke(key.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg" title="Revoke">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
