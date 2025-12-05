'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Locate, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import map to avoid SSR issues
const MiniMapPicker = dynamic(
  () => import('../../operations/MiniMapPicker'),
  { ssr: false, loading: () => <div className="h-48 bg-slate-800 rounded-xl animate-pulse" /> }
);

interface FieldReportLocationPickerProps {
  locationName: string;
  setLocationName: (name: string) => void;
  latitude: number | null;
  longitude: number | null;
  setLatitude: (lat: number | null) => void;
  setLongitude: (lng: number | null) => void;
}

export default function FieldReportLocationPicker({
  locationName, setLocationName, latitude, longitude, setLatitude, setLongitude
}: FieldReportLocationPickerProps) {
  const [showMap, setShowMap] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setShowMap(true);
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">Lokasi</label>
      
      {/* Location Name Input */}
      <input
        type="text"
        value={locationName}
        onChange={e => setLocationName(e.target.value)}
        placeholder="Nama lokasi (contoh: Kelurahan Cipinang Besar)"
        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500"
      />

      {/* Location Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm disabled:opacity-50"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Locate className="w-4 h-4" />
          )}
          Lokasi Saat Ini
        </button>
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm"
        >
          <MapPin className="w-4 h-4" />
          {showMap ? 'Sembunyikan Peta' : 'Pilih di Peta'}
        </button>
      </div>

      {/* Coordinates Display */}
      {latitude !== null && longitude !== null && (
        <div className="text-xs text-slate-400">
          Koordinat: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      )}

      {/* Map Picker */}
      {showMap && (
        <div className="mt-2">
          <MiniMapPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
            markerColor="blue"
          />
        </div>
      )}
    </div>
  );
}
