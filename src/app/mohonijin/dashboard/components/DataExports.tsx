'use client';

import { useState, useEffect } from 'react';
import { Download, FileJson, FileSpreadsheet, MapPin, Filter, Calendar, Building, Shield } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
}

export default function DataExports() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter state
  const [format, setFormat] = useState<'json' | 'csv' | 'geojson'>('csv');
  const [status, setStatus] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('');
  const [disasterType, setDisasterType] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [anonymize, setAnonymize] = useState(true);
  const [limit, setLimit] = useState<number>(1000);

  useEffect(() => {
    fetchOrganizations();
  }, []);

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

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (status) params.set('status', status);
      if (sourceType) params.set('sourceType', sourceType);
      if (disasterType) params.set('disasterType', disasterType);
      if (organizationId) params.set('organizationId', organizationId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('anonymize', String(anonymize));
      params.set('limit', String(limit));

      const res = await fetch(`/api/mohonijin/export/incidents?${params}`);
      
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Export failed');
      }

      // Download file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incidents_export_${new Date().toISOString().split('T')[0]}.${format === 'geojson' ? 'geojson' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccess('Export completed successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-xl">
          <Download className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Data Exports</h2>
          <p className="text-xs text-slate-400">Export incident data with filters and anonymization</p>
        </div>
      </div>

      {/* Export Form */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Export Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Format */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('csv')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  format === 'csv' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  format === 'json' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <FileJson className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={() => setFormat('geojson')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  format === 'geojson' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <MapPin className="w-4 h-4" />
                GeoJSON
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Source Type */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All Sources</option>
              <option value="emergency_report">Emergency Reports</option>
              <option value="crowdsource_submission">Crowdsource</option>
            </select>
          </div>

          {/* Disaster Type */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Disaster Type</label>
            <select
              value={disasterType}
              onChange={(e) => setDisasterType(e.target.value)}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All Types</option>
              <option value="flood">Flood</option>
              <option value="earthquake">Earthquake</option>
              <option value="fire">Fire</option>
              <option value="landslide">Landslide</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Organization */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Organization</label>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Max Records</label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          {/* Anonymize Toggle */}
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymize}
                onChange={(e) => setAnonymize(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-700 border-white/10 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white">Anonymize PII</span>
              </div>
            </label>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Export Button */}
        <div className="mt-6">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
          >
            <Download className={`w-5 h-5 ${exporting ? 'animate-bounce' : ''}`} />
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
        <h4 className="text-sm font-medium text-white mb-2">About Anonymization</h4>
        <p className="text-xs text-slate-400">
          When enabled, personal identifiable information (PII) such as names, phone numbers, and emails 
          are automatically anonymized in exports. This helps comply with data protection requirements 
          when sharing data with external partners.
        </p>
      </div>
    </div>
  );
}
