'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EmergencyMarkers from './map/EmergencyMarkers';
import ContributionMarkers from './map/ContributionMarkers';

type FilterType = 'all' | 'emergency' | 'contribution';
type EmergencyType = 'all' | 'evacuation' | 'food_water' | 'medical' | 'other' | 'none';
type ContributionType = 'all' | 'shelter' | 'food_water' | 'medical' | 'clothing';

interface MapLeafletProps {
  center?: [number, number];
  zoom?: number;
  zoomControl?: boolean;
  attributionControl?: boolean;
  className?: string;
  filterType?: FilterType;
  emergencyType?: EmergencyType;
  contributionType?: ContributionType;
}

/**
 * Main map component that displays emergency and contribution markers
 * Uses Leaflet with a dark theme from CartoDB
 * 
 * @param center - Center coordinates of the map [latitude, longitude]
 * @param zoom - Initial zoom level
 * @param zoomControl - Whether to show zoom controls
 * @param attributionControl - Whether to show attribution
 * @param className - CSS class for the map container
 */
const MapLeaflet = ({
  center = [-6.2088, 106.8456], // Center on Jakarta
  zoom = 13,
  zoomControl = false,
  attributionControl = true,
  className = "w-full h-full",
  filterType = 'all',
  emergencyType = 'all',
  contributionType = 'all'
}: MapLeafletProps) => {
  
  // Set up Leaflet configuration and styles on component mount
  useEffect(() => {
    // Fix Leaflet default icon issues
    if (typeof window !== 'undefined') {
      // @ts-ignore - Known issue with Leaflet types
      delete L.Icon.Default.prototype._getIconUrl;
      
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        shadowUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      });
    }
  }, []);

  /**
   * Format a date string to a localized format
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Render available facilities as a list
   * @param facilities - Object containing facility availability flags
   * @returns JSX element with facility list or null if no facilities
   */
  const renderFacilities = (facilities: any) => {
    if (!facilities) return null;
    
    return (
      <div className="mt-2 text-sm">
        <p className="font-medium mb-1">Fasilitas:</p>
        <ul className="list-disc list-inside">
          {facilities.food_water && <li>Makanan & Air</li>}
          {facilities.medical && <li>Obat-obatan</li>}
          {facilities.clothing && <li>Pakaian</li>}
          {facilities.electricity && <li>Listrik</li>}
          {facilities.internet && <li>Internet</li>}
        </ul>
      </div>
    );
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={zoomControl}
      attributionControl={attributionControl}
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      {/* Dark theme map tiles from CartoDB */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <ZoomControl position="topright" />

      {/* Emergency Markers */}
      {(filterType === 'all' || filterType === 'emergency') && (
        <EmergencyMarkers 
          formatDate={formatDate} 
          filterType={emergencyType}
        />
      )}

      {/* Contribution Markers */}
      {(filterType === 'all' || filterType === 'contribution') && (
        <ContributionMarkers 
          formatDate={formatDate} 
          renderFacilities={renderFacilities}
          filterType={contributionType}
        />
      )}
    </MapContainer>
  );
};

export default MapLeaflet;
