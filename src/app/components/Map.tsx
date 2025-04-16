'use client';

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

type FilterType = 'all' | 'emergency' | 'contribution';
type EmergencyType = 'all' | 'evacuation' | 'food_water' | 'medical' | 'other' | 'none';
type ContributionType = 'all' | 'shelter' | 'food_water' | 'medical' | 'clothing';

interface MapProps {
  center?: [number, number];
  filterType?: FilterType;
  emergencyType?: EmergencyType;
  contributionType?: ContributionType;
}

// Dynamically import Leaflet components with no SSR to avoid hydration issues
const MapWithNoSSR = dynamic(() => import('./MapLeaflet'), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-zinc-900 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
});

export default function MapComponent({ center, filterType, emergencyType, contributionType }: MapProps) {
  return (
    <div className="w-full h-screen">
      <MapWithNoSSR 
        center={center} 
        filterType={filterType}
        emergencyType={emergencyType}
        contributionType={contributionType}
      />
    </div>
  );
}
