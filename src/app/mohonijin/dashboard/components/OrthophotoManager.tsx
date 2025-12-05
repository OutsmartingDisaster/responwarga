'use client';

import { useState, useEffect } from 'react';
import { Image, Upload, Trash2, Eye, MapPin, Calendar, HardDrive, RefreshCw, Plus, X } from 'lucide-react';

interface Orthophoto {
  id: string;
  name: string;
  description: string | null;
  disaster_type: string | null;
  organization_id: string | null;
  organization_name: string | null;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'archived';
  visibility: string;
  original_file_path: string | null;
  thumbnail_path: string | null;
  file_size_bytes: number | null;
  capture_date: string | null;
  bounds_west: number | null;
  bounds_east: number | null;
  bounds_south: number | null;
  bounds_north: number | null;
  created_at: string;
  uploaded_by_name: string | null;
}

interface Organization {
  id: string;
  name: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    pending: { label: 'Pending', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    processing: { label: 'Processing', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    ready: { label: 'Ready', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
    failed: { label: 'Failed', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
    archived: { label: 'Archived', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  };
  const { label, classes } = config[status] || config.pending;

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${classes}`}>
      {label}
    </span>
  );
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function OrthophotoManager() {
  const [orthophotos, setOrthophotos] = useState<Orthophoto[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Upload form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrgId, setFormOrgId] = useState('');
  const [formDisasterType, setFormDisasterType] = useState('');
  const [formCaptureDate, setFormCaptureDate] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formBounds, setFormBounds] = useState({ west: '', east: '', south: '', north: '' });

  useEffect(() => {
    fetchOrthophotos();
    fetchOrganizations();
  }, [statusFilter]);

  const fetchOrthophotos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      
      const res = await fetch(`/api/mohonijin/orthophotos?${params}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setOrthophotos(result.data || []);
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

  const handleUpload = async () => {
    if (!formName.trim()) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', formName);
      if (formDescription) formData.append('description', formDescription);
      if (formOrgId) formData.append('organization_id', formOrgId);
      if (formDisasterType) formData.append('disaster_type', formDisasterType);
      if (formCaptureDate) formData.append('capture_date', formCaptureDate);
      if (formFile) formData.append('file', formFile);
      if (formBounds.west) formData.append('bounds_west', formBounds.west);
      if (formBounds.east) formData.append('bounds_east', formBounds.east);
      if (formBounds.south) formData.append('bounds_south', formBounds.south);
      if (formBounds.north) formData.append('bounds_north', formBounds.north);

      const res = await fetch('/api/mohonijin/orthophotos', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setShowUploadForm(false);
      resetForm();
      fetchOrthophotos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this orthophoto?')) return;

    try {
      const res = await fetch(`/api/mohonijin/orthophotos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }
      fetchOrthophotos();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormOrgId('');
    setFormDisasterType('');
    setFormCaptureDate('');
    setFormFile(null);
    setFormBounds({ west: '', east: '', south: '', north: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-xl">
            <Image className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Orthophotos</h2>
            <p className="text-xs text-slate-400">Manage aerial imagery for disaster assessment</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrthophotos}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Orthophoto
          </button>
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
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="ready">Ready</option>
          <option value="failed">Failed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUploadForm(false)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Add Orthophoto</h3>
              <button onClick={() => setShowUploadForm(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Flood Assessment - Jakarta North"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Organization</label>
                  <select
                    value={formOrgId}
                    onChange={(e) => setFormOrgId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">None</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Disaster Type</label>
                  <select
                    value={formDisasterType}
                    onChange={(e) => setFormDisasterType(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select type</option>
                    <option value="flood">Flood</option>
                    <option value="earthquake">Earthquake</option>
                    <option value="fire">Fire</option>
                    <option value="landslide">Landslide</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Capture Date</label>
                <input
                  type="date"
                  value={formCaptureDate}
                  onChange={(e) => setFormCaptureDate(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">File (GeoTIFF)</label>
                <input
                  type="file"
                  accept=".tif,.tiff,.geotiff"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-xs"
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleUpload}
                  disabled={!formName.trim() || uploading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => { setShowUploadForm(false); resetForm(); }}
                  className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !showUploadForm && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Orthophoto Grid */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : orthophotos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No orthophotos found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orthophotos.map(ortho => (
              <div key={ortho.id} className="bg-slate-700/30 rounded-xl overflow-hidden">
                {/* Thumbnail */}
                <div className="h-32 bg-slate-800 flex items-center justify-center">
                  {ortho.thumbnail_path ? (
                    <img src={ortho.thumbnail_path} alt={ortho.name} className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-12 h-12 text-slate-600" />
                  )}
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-medium text-sm truncate flex-1">{ortho.name}</h4>
                    <StatusBadge status={ortho.status} />
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    {ortho.disaster_type && (
                      <p className="capitalize">{ortho.disaster_type}</p>
                    )}
                    {ortho.organization_name && (
                      <p className="truncate">{ortho.organization_name}</p>
                    )}
                    <div className="flex items-center gap-3">
                      {ortho.file_size_bytes && (
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatFileSize(ortho.file_size_bytes)}
                        </span>
                      )}
                      {ortho.capture_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(ortho.capture_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    {ortho.bounds_west && (
                      <button className="flex items-center gap-1 px-2 py-1 bg-slate-600/50 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors">
                        <MapPin className="w-3 h-3" />
                        View on Map
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(ortho.id)}
                      className="ml-auto p-1.5 hover:bg-red-500/20 rounded transition-colors"
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
