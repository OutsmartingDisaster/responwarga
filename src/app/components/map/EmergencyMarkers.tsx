'use client';

import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { markerIcons } from './MarkerIcons';
import { EmergencyMarker } from './types';
import MarkerPopup from './MarkerPopup';
import { supabase } from '@/lib/supabase';
import { getOffsetPosition, resetPositionCounts } from './MarkerUtils';

type EmergencyType = 'all' | 'evacuation' | 'food_water' | 'medical' | 'other' | 'none';

interface EmergencyMarkersProps {
  formatDate: (dateString: string) => string;
  filterType?: EmergencyType;
}

/**
 * Component that displays emergency report markers on the map
 * Fetches data from Supabase and displays it as individual markers
 * 
 * @param formatDate - Function to format date strings for display
 */
export default function EmergencyMarkers({ formatDate, filterType = 'all' }: EmergencyMarkersProps) {
  const [markers, setMarkers] = useState<EmergencyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch emergency reports and subscribe to realtime updates
  useEffect(() => {
    console.log('Filter type changed:', filterType);
    fetchEmergencyReports();

    // Supabase Realtime subscription
    const channel = supabase
      .channel('emergency_reports_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_reports' },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchEmergencyReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      resetPositionCounts();
    };
  }, [filterType]);

  /**
   * Fetch emergency reports from Supabase database
   * Transforms the data to match the EmergencyMarker interface
   */
  const fetchEmergencyReports = async () => {
    try {
      setLoading(true);
      console.log('Fetching emergency reports with filter:', filterType);
      
      // Updated query with joins for assignee and organization name
      let query = supabase
        .from('emergency_reports')
        .select(`
          *,
          assignee:profiles ( name ),
          organization:disaster_responses!inner!emergency_reports_disaster_response_id_fkey ( org_name:name )
        `)
        .order('created_at', { ascending: false });

      // Apply type filter if specified
      if (filterType !== 'all') {
        query = query.eq('assistance_type', filterType);
      }

      // Adjust query if using fallback select
      // if (filterType !== 'all') { query = query.eq('assistance_type', filterType); }
      // query = query.eq('assignee.user_id', 'emergency_reports.assigned_to'); // Manual join condition if needed

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Emergency data with assignee:', data);
      
      if (!data || data.length === 0) {
        console.log('No emergency reports found for filter:', filterType);
        setMarkers([]);
        setLoading(false);
        return;
      }

      // Transform the data including assignee name and org name
      const formattedData: EmergencyMarker[] = data.map((item: any) => ({
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        full_name: item.full_name,
        description: item.description,
        assistance_type: item.assistance_type || 'none',
        status: item.status || 'needs_verification',
        photo_url: item.photo_url,
        created_at: item.created_at,
        // Extract assignee name - structure might change slightly if profiles is null
        assignee_name: item.assignee?.name || null, 
        assignee_org_name: item.organization?.org_name || null 
      }));

      console.log('Formatted emergency markers:', formattedData);
      setMarkers(formattedData);
    } catch (err: any) {
      // Log the full error object and specific properties for better debugging
      console.error('Error fetching emergency reports:', err);
      console.error('Supabase error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
      });
      setError(err.message || 'Unknown error fetching reports');
    } finally {
      setLoading(false);
    }
  };

  // For debugging
  console.log('Rendering emergency markers, count:', markers.length);
  
  // Don't render anything while loading or if there's an error
  if (loading) return null;
  if (error) return null;

  // Reset position tracking before rendering markers
  resetPositionCounts();

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
