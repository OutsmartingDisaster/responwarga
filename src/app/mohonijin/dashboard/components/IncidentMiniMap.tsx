'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Incident } from '@/types/incidents';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

import { DARK_BASEMAP, MAP_DEFAULTS } from '@/lib/map/config';

interface IncidentMiniMapProps {
  incidents: Incident[];
  height?: string;
}

// Get marker color based on incident status
function getMarkerColor(status: string): string {
  switch (status) {
    case 'open': return '#ef4444'; // red
    case 'in_review': return '#f97316'; // orange
    case 'resolved': return '#22c55e'; // green
    default: return '#6b7280'; // gray
  }
}

export default function IncidentMiniMap({ incidents, height = '300px' }: IncidentMiniMapProps) {
  // Filter incidents with valid coordinates
  const mappableIncidents = useMemo(() => 
    incidents.filter(i => i.latitude !== null && i.longitude !== null),
    [incidents]
  );

  // Calculate center based on incidents or use default
  const center = useMemo(() => {
    if (mappableIncidents.length === 0) {
      return [MAP_DEFAULTS.center.lat, MAP_DEFAULTS.center.lng] as [number, number];
    }
    const avgLat = mappableIncidents.reduce((sum, i) => sum + (i.latitude || 0), 0) / mappableIncidents.length;
    const avgLng = mappableIncidents.reduce((sum, i) => sum + (i.longitude || 0), 0) / mappableIncidents.length;
    return [avgLat, avgLng] as [number, number];
  }, [mappableIncidents]);

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-lg font-bold text-white">Incident Map</h3>
        <p className="text-xs text-slate-400 mt-1">
          {mappableIncidents.length} incidents with location data
        </p>
      </div>
      <div style={{ height }} className="relative">
        <MapContainer
          center={center}
          zoom={mappableIncidents.length > 0 ? 6 : MAP_DEFAULTS.zoom}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution={DARK_BASEMAP.attribution}
            url={DARK_BASEMAP.url}
            subdomains={DARK_BASEMAP.subdomains}
            maxZoom={DARK_BASEMAP.maxZoom}
          />
          {mappableIncidents.map((incident) => (
            <CircleMarker
              key={incident.id}
              center={[incident.latitude!, incident.longitude!]}
              radius={8}
              pathOptions={{
                fillColor: getMarkerColor(incident.incident_status),
                fillOpacity: 0.8,
                color: '#ffffff',
                weight: 2,
                opacity: 0.6,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">{incident.assistance_type || incident.disaster_type || 'Incident'}</p>
                  <p className="text-gray-600 capitalize">{incident.incident_status.replace('_', ' ')}</p>
                  {incident.location_name && (
                    <p className="text-gray-500 mt-1">{incident.location_name}</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        
        {/* Legend */}
        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm rounded-lg p-2 z-[1000]">
          <div className="flex flex-col gap-1 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-slate-300">Open</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-slate-300">In Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-slate-300">Resolved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
