'use client';

import { useState } from 'react';
import { Plus, Trash2, MapPin, ChevronDown, ChevronUp, Search, Navigation, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

export interface GeofenceZone {
  id?: string;
  zone_name: string;
  zone_level: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  admin_area_code?: string;
  display_order: number;
}

interface MultiZoneEditorProps {
  zones: GeofenceZone[];
  onChange: (zones: GeofenceZone[]) => void;
  onSave?: (zone: GeofenceZone) => Promise<void>;
  onDelete?: (zoneId: string) => Promise<void>;
}

const ZONE_LEVELS = [
  { value: 'radius', label: 'Radius (km)' },
  { value: 'kelurahan', label: 'Kelurahan/Desa' },
  { value: 'kecamatan', label: 'Kecamatan' },
  { value: 'kabupaten', label: 'Kabupaten/Kota' },
  { value: 'provinsi', label: 'Provinsi' },
];

export default function MultiZoneEditor({ zones, onChange, onSave, onDelete }: MultiZoneEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [newZone, setNewZone] = useState<GeofenceZone>({
    zone_name: '', zone_level: 'provinsi', latitude: 0, longitude: 0, radius_km: 50, display_order: 0
  });

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setNewZone(prev => ({
          ...prev,
          zone_name: display_name.split(',')[0],
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        }));
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddZone = async () => {
    if (!newZone.zone_name || !newZone.latitude) return;
    const zone = { ...newZone, display_order: zones.length };
    if (onSave) {
      await onSave(zone);
    } else {
      onChange([...zones, { ...zone, id: `temp-${Date.now()}` }]);
    }
    setNewZone({ zone_name: '', zone_level: 'provinsi', latitude: 0, longitude: 0, radius_km: 50, display_order: 0 });
    setSearchQuery('');
    setShowAddForm(false);
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('Hapus zona ini?')) return;
    if (onDelete) await onDelete(id);
    else onChange(zones.filter(z => z.id !== id));
  };

  const moveZone = (index: number, direction: 'up' | 'down') => {
    const newZones = [...zones];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= zones.length) return;
    [newZones[index], newZones[targetIndex]] = [newZones[targetIndex], newZones[index]];
    newZones.forEach((z, i) => z.display_order = i);
    onChange(newZones);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Zona Geofence</h3>
          <p className="text-xs text-slate-400">Tambahkan beberapa lokasi untuk project multi-daerah</p>
        </div>
        {!showAddForm && (
          <button type="button" onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm">
            <Plus size={14} /> Tambah Zona
          </button>
        )}
      </div>

      {/* Add Zone Form */}
      {showAddForm && (
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Cari lokasi (contoh: Provinsi Aceh)..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchLocation()}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" />
            </div>
            <button type="button" onClick={searchLocation} disabled={searching}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm disabled:opacity-50">
              {searching ? <Loader2 size={16} className="animate-spin" /> : 'Cari'}
            </button>
          </div>

          {newZone.latitude !== 0 && (
            <>
              <div className="h-32 rounded-lg overflow-hidden">
                <MapComponent center={{ lat: newZone.latitude, lng: newZone.longitude }}
                  marker={{ lat: newZone.latitude, lng: newZone.longitude }} zoom={8} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nama Zona</label>
                  <input type="text" value={newZone.zone_name}
                    onChange={e => setNewZone(p => ({ ...p, zone_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Level</label>
                  <select value={newZone.zone_level}
                    onChange={e => setNewZone(p => ({ ...p, zone_level: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm">
                    {ZONE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              {newZone.zone_level === 'radius' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Radius (km)</label>
                  <input type="number" value={newZone.radius_km}
                    onChange={e => setNewZone(p => ({ ...p, radius_km: parseFloat(e.target.value) }))}
                    className="w-24 px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" />
                </div>
              )}
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { setShowAddForm(false); setSearchQuery(''); setNewZone({ zone_name: '', zone_level: 'provinsi', latitude: 0, longitude: 0, radius_km: 50, display_order: 0 }); }}
              className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm">Batal</button>
            <button type="button" onClick={handleAddZone} disabled={!newZone.zone_name || !newZone.latitude}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm disabled:opacity-50">Tambah Zona</button>
          </div>
        </div>
      )}

      {/* Zone List */}
      {zones.length === 0 && !showAddForm ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          <MapPin size={32} className="mx-auto mb-2 opacity-50" />
          <p>Belum ada zona. Klik "Tambah Zona" untuk menambahkan lokasi.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {zones.map((zone, index) => (
            <div key={zone.id} className="bg-slate-800/40 border border-white/5 rounded-xl p-3 flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => moveZone(index, 'up')} disabled={index === 0}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronUp size={14} /></button>
                <button type="button" onClick={() => moveZone(index, 'down')} disabled={index === zones.length - 1}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronDown size={14} /></button>
              </div>
              <MapPin size={20} className="text-blue-400" />
              <div className="flex-1">
                <p className="font-medium text-white">{zone.zone_name}</p>
                <p className="text-xs text-slate-400">
                  {ZONE_LEVELS.find(l => l.value === zone.zone_level)?.label}
                  {zone.zone_level === 'radius' && ` - ${zone.radius_km} km`}
                </p>
              </div>
              <button type="button" onClick={() => handleDeleteZone(zone.id!)}
                className="p-2 hover:bg-red-500/20 rounded text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
