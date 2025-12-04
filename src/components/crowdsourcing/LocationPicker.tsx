'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';

interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (location: { lat: number; lng: number }, address: string) => void;
  center?: { lat: number; lng: number };
  disabled?: boolean;
}

export default function LocationPicker({ value, onChange, center, disabled }: LocationPickerProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);

  // Reverse geocode to get address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Search address
  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const location = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setAddress(display_name);
        onChange(location, display_name);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Use current location
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

  // Handle map click (simplified - just show coordinates)
  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Simple calculation for demo (would need proper map library for real implementation)
    const defaultCenter = center || { lat: -6.2088, lng: 106.8456 };
    const lat = defaultCenter.lat + (rect.height / 2 - y) * 0.0001;
    const lng = defaultCenter.lng + (x - rect.width / 2) * 0.0001;
    
    setLoading(true);
    const addr = await reverseGeocode(lat, lng);
    setAddress(addr);
    onChange({ lat, lng }, addr);
    setLoading(false);
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
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={disabled || loading}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          <span className="hidden sm:inline">Lokasi Saya</span>
        </button>
      </div>

      {/* Map placeholder */}
      <div
        ref={mapRef}
        onClick={handleMapClick}
        className="relative h-48 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden cursor-crosshair"
      >
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
          {value ? (
            <div className="text-center">
              <MapPin size={32} className="mx-auto text-blue-500 mb-2" />
              <p className="text-xs">{value.lat.toFixed(6)}, {value.lng.toFixed(6)}</p>
            </div>
          ) : (
            <p className="text-sm">Klik untuk pilih lokasi atau gunakan tombol di atas</p>
          )}
        </div>
        {/* Note: For production, integrate with Leaflet/Mapbox */}
      </div>

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
