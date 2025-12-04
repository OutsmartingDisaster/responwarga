'use client';

import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getMarkerIcon } from './MarkerIcons';
import { ContributionMarker } from './types';
import MarkerPopup from './MarkerPopup';
import { getOffsetPosition, resetPositionCounts } from './MarkerUtils';

// Define the radius in meters (e.g., 15km)
const GEOFENCE_RADIUS_METERS = 15000;

type ContributionType = 'all' | 'shelter' | 'food_water' | 'medical' | 'clothing';

interface ContributionMarkersProps {
  formatDate: (dateString: string) => string;
  renderFacilities: (facilities: any) => React.ReactElement | null;
  filterType?: ContributionType;
  activeDisasterResponseId?: string | null;
}

/**
 * Component that displays community contribution markers on the map
 * Fetches data from PostgreSQL database and displays it as individual markers
 * 
 * @param formatDate - Function to format date strings for display
 * @param renderFacilities - Function to render facility information
 */
export default function ContributionMarkers({ formatDate, renderFacilities, filterType = 'all', activeDisasterResponseId }: ContributionMarkersProps) {
  const [markers, setMarkers] = useState<ContributionMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch contributions
  useEffect(() => {
    console.log('Filter type changed:', filterType);
    fetchContributions();
    // Realtime subscription removed
  }, [filterType, activeDisasterResponseId]);

  /**
   * Fetch community contributions from PostgreSQL database
   * Transforms the data to match the ContributionMarker interface
   */
  const fetchContributions = async () => {
    try {
      setLoading(true);
      console.log('Fetching contributions with filter:', filterType);

      let data;

      // Fetch contributions based on whether a specific disaster response ID is provided
      if (activeDisasterResponseId) {
        // 1. Fetch the disaster response location
        const responseLoc = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'select',
            table: 'disaster_responses',
            columns: 'latitude, longitude',
            filters: [{ column: 'id', operator: 'eq', value: activeDisasterResponseId }],
            single: true
          })
        });

        const responseLocResult = await responseLoc.json();
        const responseData = responseLocResult.data;

        if (!responseLoc.ok || !responseData || responseData.latitude == null || responseData.longitude == null) {
          console.error('Error fetching disaster response location:', responseLocResult.error);
          setError('Could not fetch active disaster response location.');
          setMarkers([]);
          setLoading(false);
          return;
        }

        const { latitude: centerLat, longitude: centerLon } = responseData;

        // 2. Call the RPC function to get contributions within the radius
        const rpcResponse = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rpc',
            functionName: 'get_contributions_within_radius',
            args: {
              center_lat: centerLat,
              center_lon: centerLon,
              radius_meters: GEOFENCE_RADIUS_METERS
            }
          })
        });

        const rpcResult = await rpcResponse.json();

        if (!rpcResponse.ok) {
          console.error('RPC error (get_contributions_within_radius):', rpcResult.error);
          throw new Error(rpcResult.error?.message || 'RPC failed');
        }

        data = rpcResult.data;

      } else {
        // Original logic: Fetch all or filter by type if no geofence ID is provided
        const filters = [];
        if (filterType !== 'all') {
          filters.push({ column: 'contribution_type', operator: 'eq', value: filterType });
        }

        const queryResponse = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'select',
            table: 'contributions',
            filters: filters,
            order: [{ column: 'created_at', ascending: false }]
          })
        });

        const queryResult = await queryResponse.json();

        if (!queryResponse.ok) {
          console.error('Database query error:', queryResult.error);
          throw new Error(queryResult.error?.message || 'Query failed');
        }
        data = queryResult.data;
      }

      console.log('Contributions data (filtered/geofenced):', data);

      if (!data || data.length === 0) {
        console.log('No contributions found for filter:', filterType);
        setMarkers([]);
        setLoading(false);
        return;
      }

      // Filter out items without valid coordinates and then transform
      const formattedData: ContributionMarker[] = data
        .filter((item: any) => item.latitude != null && item.longitude != null)
        .map((item: any) => ({
          id: item.id,
          latitude: item.latitude,
          longitude: item.longitude,
          full_name: item.full_name,
          phone_number: item.phone_number,
          email: item.email,
          description: item.description,
          contribution_type: item.contribution_type || 'shelter',
          capacity: item.capacity,
          facilities: item.facilities,
          quantity: item.quantity,
          unit: item.unit,
          photo_url: item.photo_url,
          created_at: item.created_at,
          show_contact_info: item.show_contact_info
        }));

      console.log('Formatted markers:', formattedData);
      setMarkers(formattedData);
    } catch (err: any) {
      console.error('Error fetching contributions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // For debugging
  console.log('Rendering contribution markers, count:', markers.length);
  console.log('Loading:', loading, 'Error:', error);

  // Don't render anything while loading or if there's an error
  if (loading) {
    console.log('Still loading contributions...');
    return null;
  }

  if (error) {
    console.log('Error rendering contributions:', error);
    return null;
  }

  // Create test markers if no real markers exist
  if (markers.length === 0) {
    console.log('No real markers - adding test marker');

    // Add a test marker at Jakarta center
    const testMarker: ContributionMarker = {
      id: 'test-1',
      latitude: -6.2088,
      longitude: 106.8456,
      full_name: 'Test Contribution',
      description: 'This is a test contribution marker',
      contribution_type: 'shelter',
      created_at: new Date().toISOString()
    };

    // Add another test marker at the same coordinates to demonstrate offset
    const testMarker2: ContributionMarker = {
      id: 'test-2',
      latitude: -6.2088,
      longitude: 106.8456,
      full_name: 'Test Contribution 2',
      description: 'Another test contribution at the same location',
      contribution_type: 'food_water',
      created_at: new Date().toISOString()
    };

    return (
      <>
        <Marker
          key="test-marker-1"
          position={getOffsetPosition(-6.2088, 106.8456)}
          icon={getMarkerIcon('shelter')!}
        >
          <Popup className="dark-popup">
            <MarkerPopup marker={testMarker} formatDate={formatDate} renderFacilities={renderFacilities} />
          </Popup>
        </Marker>
        <Marker
          key="test-marker-2"
          position={getOffsetPosition(-6.2088, 106.8456)}
          icon={getMarkerIcon('food_water')!}
        >
          <Popup className="dark-popup">
            <MarkerPopup marker={testMarker2} formatDate={formatDate} renderFacilities={renderFacilities} />
          </Popup>
        </Marker>
      </>
    );
  }

  return (
    <>
      {/* Render a marker for each contribution, with icon based on type and offset position if needed */}
      {markers.map((marker) => {
        // Get position with offset if necessary
        const position = getOffsetPosition(marker.latitude, marker.longitude);

        return (
          <Marker
            key={marker.id}
            position={position}
            icon={getMarkerIcon(marker.contribution_type)!}
          >
            <Popup className="dark-popup">
              <MarkerPopup marker={marker} formatDate={formatDate} renderFacilities={renderFacilities} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
