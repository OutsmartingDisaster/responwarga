'use client';

import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { markerIcons } from './MarkerIcons';
import { EmergencyMarker } from './types';
import MarkerPopup from './MarkerPopup';
import { supabase } from '@/lib/supabase';
import { getOffsetPosition, resetPositionCounts } from './MarkerUtils';

// Define the radius in meters (e.g., 15km)
const GEOFENCE_RADIUS_METERS = 15000;

type EmergencyType = 'all' | 'evacuation' | 'food_water' | 'medical' | 'other' | 'none';

interface EmergencyMarkersProps {
  formatDate: (dateString: string) => string;
  filterType?: EmergencyType;
  reportsData?: any[] | null;
}

/**
 * Component that displays emergency report markers on the map
 * Fetches data from Supabase and displays it as individual markers
 * 
 * @param formatDate - Function to format date strings for display
 */
export default function EmergencyMarkers({ formatDate, filterType = 'all', reportsData }: EmergencyMarkersProps) {
  const [markers, setMarkers] = useState<EmergencyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No longer fetch data here, rely on props
  useEffect(() => {
    console.log('EmergencyMarkers received reportsData prop:', reportsData); // Log the received prop
    setLoading(true);
    setError(null);
    if (reportsData) {
        // Directly format the data passed via props
        const formattedData: EmergencyMarker[] = reportsData.map((item: any) => ({
            id: item.id,
            latitude: item.latitude,
            longitude: item.longitude,
            full_name: item.full_name,
            description: item.description,
            assistance_type: item.assistance_type || 'none',
            status: item.status || 'needs_verification',
            photo_url: item.photo_url,
            created_at: item.created_at,
            assignee_name: item.assignee?.name || null, // Assuming assignee relationship might still be relevant if fetched in parent
            assignee_org_name: item.organization?.org_name || null 
        }));
        console.log('Formatted emergency markers from props:', formattedData);
        setMarkers(formattedData);
    } else {
        setMarkers([]); // Clear markers if no data is passed
        console.log('No reportsData prop provided.');
    }
    setLoading(false);
  }, [reportsData]); // Re-run effect if reportsData prop changes

  // For debugging
  console.log('Rendering emergency markers, count:', markers.length);
  
  // Don't render anything while loading or if there's an error
  if (loading) return null;
  if (error) return null;

  // Reset position tracking before rendering markers
  // resetPositionCounts();

  // Create test markers if no real markers exist
  if (markers.length === 0) {
    console.log('No real emergency markers - adding test marker');
    // Add a test marker near Jakarta center
    const testMarker: EmergencyMarker = {
      id: 'test-emergency-1',
      latitude: -6.21,
      longitude: 106.85,
      full_name: 'Test Emergency',
      description: 'This is a test emergency marker',
      assistance_type: 'evacuation',
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    // Add a second test marker at exactly the same coordinates to demonstrate offset
    const testMarker2: EmergencyMarker = {
      id: 'test-emergency-2',
      latitude: -6.21,
      longitude: 106.85,
      full_name: 'Test Emergency 2',
      description: 'This is another test emergency marker at the same location',
      assistance_type: 'medical',
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    return (
      <>
        <Marker
          key="test-emergency-marker-1"
          position={getOffsetPosition(-6.21, 106.85)}
          icon={markerIcons.emergency}
        >
          <Popup className="dark-popup">
            <MarkerPopup marker={testMarker} formatDate={formatDate} />
          </Popup>
        </Marker>
        <Marker
          key="test-emergency-marker-2"
          position={getOffsetPosition(-6.21, 106.85)}
          icon={markerIcons.emergency}
        >
          <Popup className="dark-popup">
            <MarkerPopup marker={testMarker2} formatDate={formatDate} />
          </Popup>
        </Marker>
      </>
    );
  }

  return (
    <>
      {/* Render a marker for each emergency report with position offsets if needed */}
      {markers.map((marker) => {
        // Get position with offset if necessary
        console.log('Processing marker:', marker);
        const position = getOffsetPosition(marker.latitude, marker.longitude);
        
        return (
          <Marker
            key={marker.id}
            position={position}
            icon={markerIcons.emergency}
          >
            <Popup className="dark-popup">
              <MarkerPopup marker={marker} formatDate={formatDate} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
