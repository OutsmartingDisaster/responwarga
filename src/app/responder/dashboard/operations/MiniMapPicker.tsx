'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Locate } from 'lucide-react';
import { DEFAULT_BASEMAP, MARKER_ICONS } from '@/lib/map/config';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions(MARKER_ICONS.default);

interface MiniMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  radius?: number;
  onLocationChange: (lat: number, lng: number) => void;
  markerColor?: 'red' | 'blue' | 'green';
}

// Custom marker icons
const createMarkerIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const MARKER_COLORS = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e'
};

// Component to handle map clicks
function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to recenter map
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function MiniMapPicker({ 
  latitude, 
  longitude, 
  radius,
  onLocationChange, 
  markerColor = 'red' 
}: MiniMapPickerProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2088, 106.8456]); // Default: Jakarta
  const [isLocating, setIsLocating] = useState(false);
  const markerIcon = createMarkerIcon(MARKER_COLORS[markerColor]);

  // Get user's current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onLocationChange(lat, lng);
        setMapCenter([lat, lng]);
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

  // Update center when location changes
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setMapCenter([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return (
    <div className="relative">
      <div className="h-64 rounded-xl overflow-hidden border border-white/10">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution={DEFAULT_BASEMAP.attribution}
            url={DEFAULT_BASEMAP.url}
            subdomains={DEFAULT_BASEMAP.subdomains}
            maxZoom={DEFAULT_BASEMAP.maxZoom}
          />
          
          <MapClickHandler onLocationChange={onLocationChange} />
          
          {latitude !== null && longitude !== null && (
            <>
              <MapRecenter lat={latitude} lng={longitude} />
              <Marker 
                position={[latitude, longitude]} 
                icon={markerIcon}
              />
              {radius && (
                <Circle
                  center={[latitude, longitude]}
                  radius={radius * 1000} // Convert km to meters
                  pathOptions={{
                    color: MARKER_COLORS[markerColor],
                    fillColor: MARKER_COLORS[markerColor],
                    fillOpacity: 0.1,
                    weight: 2
                  }}
                />
              )}
            </>
          )}
        </MapContainer>
      </div>

      {/* Get Current Location Button */}
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={isLocating}
        className="absolute top-3 right-3 z-10 p-2 bg-white hover:bg-gray-100 rounded-lg shadow-md transition-colors disabled:opacity-50"
        title="Gunakan lokasi saat ini"
      >
        <Locate className={`w-5 h-5 text-gray-700 ${isLocating ? 'animate-pulse' : ''}`} />
      </button>

      {/* Instructions */}
      <p className="text-xs text-slate-500 mt-2">
        Klik pada peta untuk memilih lokasi, atau gunakan tombol lokasi untuk menggunakan posisi Anda saat ini.
      </p>
    </div>
  );
}
