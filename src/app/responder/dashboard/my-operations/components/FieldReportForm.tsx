'use client';

import React, { useState } from 'react';
import { X, Loader2, Camera, MapPin, AlertTriangle, Package, FileText, WifiOff } from 'lucide-react';
import { useOfflineFieldReport } from '@/hooks/useOfflineFieldReport';
import { 
  FIELD_REPORT_CATEGORIES, 
  AID_DELIVERY_SUBCATEGORIES,
  INCIDENT_SUBCATEGORIES,
  FIELD_CONDITION_BY_DISASTER,
  SUBCATEGORY_LABELS,
  DisasterType,
  FieldReportCategory,
  Severity,
  Urgency
} from '@/types/operations';
import FieldReportLocationPicker from './FieldReportLocationPicker';
import FieldReportPhotoUpload from './FieldReportPhotoUpload';

interface FieldReportFormProps {
  operationId: string;
  disasterType: DisasterType;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_ICONS = {
  aid_delivery: Package,
  field_condition: MapPin,
  incident: AlertTriangle
};

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'mild', label: 'Ringan', color: 'bg-green-500' },
  { value: 'moderate', label: 'Sedang', color: 'bg-yellow-500' },
  { value: 'severe', label: 'Parah', color: 'bg-red-500' }
];

const URGENCY_OPTIONS: { value: Urgency; label: string; color: string }[] = [
  { value: 'low', label: 'Rendah', color: 'bg-slate-500' },
  { value: 'medium', label: 'Sedang', color: 'bg-yellow-500' },
  { value: 'high', label: 'Tinggi', color: 'bg-orange-500' },
  { value: 'critical', label: 'Kritis', color: 'bg-red-500' }
];

export default function FieldReportForm({ operationId, disasterType, onClose, onSuccess }: FieldReportFormProps) {
  const { isOnline, saveOffline } = useOfflineFieldReport();
  const [category, setCategory] = useState<FieldReportCategory | ''>('');
  const [subcategory, setSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [urgency, setUrgency] = useState<Urgency | ''>('');
  const [affectedCount, setAffectedCount] = useState('');
  const [quantityDelivered, setQuantityDelivered] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSubcategories = () => {
    if (!category) return {};
    if (category === 'aid_delivery') return AID_DELIVERY_SUBCATEGORIES;
    if (category === 'incident') return INCIDENT_SUBCATEGORIES;
    if (category === 'field_condition') {
      const subs = FIELD_CONDITION_BY_DISASTER[disasterType] || [];
      return subs.reduce((acc, key) => ({ ...acc, [key]: SUBCATEGORY_LABELS[key] || key }), {});
    }
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title) return;

    setSubmitting(true);
    setError(null);

    const reportData = {
      category, subcategory: subcategory || undefined, title, description: description || undefined,
      location_name: locationName || undefined, latitude, longitude,
      severity: severity || undefined, urgency: urgency || undefined,
      affected_count: affectedCount ? parseInt(affectedCount) : undefined,
      quantity_delivered: quantityDelivered || undefined
    };

    try {
      if (!isOnline) {
        // Save offline - photos are already URLs, we'd need to handle file storage differently
        // For now, save without photos when offline (photos require upload)
        await saveOffline(operationId, { ...reportData, photos: [] }, []);
        onSuccess();
        return;
      }

      const response = await fetch(`/api/operations/${operationId}/field-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reportData, photos })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onSuccess();
    } catch (err: any) {
      // If network error and we're supposed to be online, try saving offline
      if (err.message.includes('fetch') || err.message.includes('network')) {
        try {
          await saveOffline(operationId, { ...reportData, photos: [] }, []);
          onSuccess();
          return;
        } catch {
          // Fall through to show error
        }
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const subcategories = getSubcategories();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" /> Buat Laporan Lapangan
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!isOnline && (
            <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-400 text-sm flex items-center gap-2">
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <span>Mode offline - laporan akan disimpan & dikirim saat online</span>
            </div>
          )}
          {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Kategori *</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(FIELD_REPORT_CATEGORIES) as FieldReportCategory[]).map(cat => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <button key={cat} type="button" onClick={() => { setCategory(cat); setSubcategory(''); }}
                    className={`p-3 rounded-xl border text-center transition-all ${category === cat 
                      ? 'bg-blue-600 border-blue-500 text-white' 
                      : 'bg-slate-800/50 border-white/10 text-slate-300 hover:border-white/20'}`}>
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs">{FIELD_REPORT_CATEGORIES[cat]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategory */}
          {category && Object.keys(subcategories).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sub-kategori</label>
              <select value={subcategory} onChange={e => setSubcategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white">
                <option value="">Pilih sub-kategori</option>
                {Object.entries(subcategories).map(([key, label]) => (
                  <option key={key} value={key}>{label as string}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Judul Laporan *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Contoh: Distribusi makanan di Kelurahan X"
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Deskripsi</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Jelaskan detail laporan..."
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 resize-none" />
          </div>

          {/* Conditional Fields */}
          {category === 'field_condition' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tingkat Keparahan</label>
                <div className="flex flex-wrap gap-2">
                  {SEVERITY_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setSeverity(opt.value)}
                      className={`flex-1 min-w-[60px] px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${severity === opt.value 
                        ? `${opt.color} text-white` : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Jumlah Terdampak</label>
                <input type="number" value={affectedCount} onChange={e => setAffectedCount(e.target.value)}
                  placeholder="0" className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white" />
              </div>
            </div>
          )}

          {category === 'incident' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Urgensi</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {URGENCY_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setUrgency(opt.value)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${urgency === opt.value 
                      ? `${opt.color} text-white` : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === 'aid_delivery' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Kuantitas Bantuan</label>
              <input type="text" value={quantityDelivered} onChange={e => setQuantityDelivered(e.target.value)}
                placeholder="Contoh: 100 paket sembako, 50 liter air"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500" />
            </div>
          )}

          {/* Location */}
          <FieldReportLocationPicker locationName={locationName} setLocationName={setLocationName}
            latitude={latitude} longitude={longitude} setLatitude={setLatitude} setLongitude={setLongitude} />

          {/* Photos */}
          <FieldReportPhotoUpload photos={photos} setPhotos={setPhotos} operationId={operationId} />

          {/* Submit - sticky on mobile */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-slate-900 pb-safe">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl font-medium">Batal</button>
            <button type="submit" disabled={submitting || !category || !title}
              className="flex-1 px-4 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-2 font-medium">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan Laporan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
