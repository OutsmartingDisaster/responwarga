'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_BASEMAP, MARKER_ICONS } from '@/lib/map/config';

interface MapComponentProps {
  center: { lat: number; lng: number };
  marker: { lat: number; lng: number } | null;
  onClick?: (lat: number, lng: number) => void;
  disabled?: boolean;
  zoom?: number;
}

export default function MapComponent({ center, marker, onClick, disabled, zoom = 13 }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Fix default icon issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions(MARKER_ICONS.default);

    const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);
    
    // Grey basemap - no API key needed
    L.tileLayer(DEFAULT_BASEMAP.url, {
      attribution: DEFAULT_BASEMAP.attribution,
      subdomains: DEFAULT_BASEMAP.subdomains,
      maxZoom: DEFAULT_BASEMAP.maxZoom,
    }).addTo(map);

    if (!disabled && onClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (marker) {
      markerRef.current = L.marker([marker.lat, marker.lng]).addTo(mapInstanceRef.current);
      mapInstanceRef.current.setView([marker.lat, marker.lng], mapInstanceRef.current.getZoom());
    }
  }, [marker]);

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current && !marker) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom, marker]);

  return (
    <div 
      ref={mapRef} 
      className={`h-48 rounded-lg overflow-hidden ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-crosshair'}`}
      style={{ zIndex: 0 }}
    />
  );
}
