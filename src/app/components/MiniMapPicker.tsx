"use client";

import React, { useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_BASEMAP, MARKER_ICONS } from "@/lib/map/config";

// Fix for default marker icon in Leaflet
if (typeof window !== "undefined" && L && L.Icon.Default) {
  L.Icon.Default.mergeOptions(MARKER_ICONS.default);
}

interface MiniMapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  height?: string;
}

const DEFAULT_POSITION = { lat: -6.2088, lng: 106.8456 }; // Jakarta

import { useMap } from "react-leaflet";

function LocationMarker({ value, onChange }: { value: { lat: number; lng: number } | null; onChange: (coords: { lat: number; lng: number }) => void }) {
  const map = useMap();
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.setView([e.latlng.lat, e.latlng.lng], 15);
    },
  });

  if (!value) return null;
  return <Marker position={[value.lat, value.lng]} draggable={true} eventHandlers={{
    dragend: (e: any) => {
      const marker = e.target;
      const position = marker.getLatLng();
      onChange({ lat: position.lat, lng: position.lng });
      map.setView([position.lat, position.lng], 15);
    }
  }} />;
}


const MiniMapPicker: React.FC<MiniMapPickerProps> = ({ value, onChange, height = "240px" }) => {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (value && mapRef.current) {
      mapRef.current.setView([value.lat, value.lng], 15);
    }
  }, [value]);

  return (
    <div style={{ width: "100%", height }}>
      <MapContainer
        center={value || DEFAULT_POSITION}
        zoom={value ? 15 : 11}
        style={{ width: "100%", height }}
        whenReady={() => { /* mapRef.current is set via ref prop if available, or handle differently */ }}
        ref={mapRef}
      >
        <TileLayer
          attribution={DEFAULT_BASEMAP.attribution}
          url={DEFAULT_BASEMAP.url}
          subdomains={DEFAULT_BASEMAP.subdomains}
          maxZoom={DEFAULT_BASEMAP.maxZoom}
        />
        <LocationMarker value={value} onChange={onChange} />
      </MapContainer>
      <div className="text-xs text-zinc-400 mt-1">
        Klik pada peta untuk memilih lokasi. Marker bisa digeser.
      </div>
    </div>
  );
};

export default MiniMapPicker;
