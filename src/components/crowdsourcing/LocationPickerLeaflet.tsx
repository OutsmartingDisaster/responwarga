'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (location: { lat: number; lng: number }, address: string) => void;
  center?: { lat: number; lng: number };
  disabled?: boolean;
  showGeofenceLevel?: boolean;
  geofenceLevel?: string;
  onGeofenceLevelChange?: (level: string) => void;
}

const GEOFENCE_LEVELS = [
  { value: 'radius', label: 'Radius (km)' },
  { value: 'kelurahan', label: 'Kelurahan/Desa' },
  { value: 'kecamatan', label: 'Kecamatan' },
  { value: 'kabupaten', label: 'Kabupaten/Kota' },
  { value: 'provinsi', label: 'Provinsi' },
];

// Dynamic import for Leaflet (SSR-safe)
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="h-48 bg-zinc-800 rounded-lg flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={24} />
    </div>
  )
});

export default function LocationPickerLeaflet({ 
  value, onChange, center, disabled, 
  showGeofenceLevel, geofenceLevel = 'radius', onGeofenceLevelChange 
}: LocationPickerProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminArea, setAdminArea] = useState<any>(null);

  const defaultCenter = center || { lat: -6.2088, lng: 106.8456 };

  // Sync address when value changes externally (e.g., from EXIF)
  useEffect(() => {
    if (value && !address) {
      reverseGeocode(value.lat, value.lng).then(addr => setAddress(addr));
    }
  }, [value]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data = await res.json();
      setAdminArea(data.address);
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name, address } = data[0];
        const location = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setAddress(display_name);
        setAdminArea(address);
        onChange(location, display_name);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung browser Anda');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const addr = await reverseGeocode(location.lat, location.lng);
        setAddress(addr);
        onChange(location, addr);
        setLoading(false);
      },
      (err) => {
        alert('Gagal mendapatkan lokasi: ' + err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (disabled) return;
    setLoading(true);
    const addr = await reverseGeocode(lat, lng);
    setAddress(addr);
    onChange({ lat, lng }, addr);
    setLoading(false);
  };

  // Get admin area name based on geofence level
  const getAdminAreaName = () => {
    if (!adminArea) return null;
    switch (geofenceLevel) {
      case 'kelurahan': return adminArea.village || adminArea.suburb || adminArea.neighbourhood;
      case 'kecamatan': return adminArea.city_district || adminArea.district;
      case 'kabupaten': return adminArea.city || adminArea.county || adminArea.regency;
      case 'provinsi': return adminArea.state || adminArea.province;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Cari alamat..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchAddress()}
            disabled={disabled}
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
          />
        </div>
        <button type="button" onClick={useMyLocation} disabled={disabled || loading}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          <span className="hidden sm:inline">Lokasi Saya</span>
        </button>
      </div>

      {/* Geofence Level Selector */}
      {showGeofenceLevel && (
        <div>
          <label className="block text-sm text-slate-400 mb-1">Level Geofence</label>
          <select
            value={geofenceLevel}
            onChange={e => onGeofenceLevelChange?.(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white"
          >
            {GEOFENCE_LEVELS.map(l => (
              <option key={l.value} value={l.value} className="bg-slate-800 text-white">{l.label}</option>
            ))}
          </select>
          {geofenceLevel !== 'radius' && adminArea && (
            <p className="text-xs text-blue-400 mt-2">
              Area Geofence: <span className="font-medium">{getAdminAreaName() || 'Pilih lokasi untuk melihat area'}</span>
            </p>
          )}
        </div>
      )}

      {/* Map */}
      <MapComponent
        center={value || defaultCenter}
        marker={value}
        onClick={handleMapClick}
        disabled={disabled}
      />

      {/* Address display */}
      {address && (
        <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
          <p className="text-xs text-zinc-400 mb-1">Alamat:</p>
          <p className="text-sm text-white">{address}</p>
        </div>
      )}
    </div>
  );
}
