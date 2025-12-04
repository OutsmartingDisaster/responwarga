// Types for marker data
export interface BaseMarker {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  photo_url?: string;
  created_at: string;
}

export interface EmergencyMarker extends BaseMarker {
  full_name: string;
  assistance_type: 'evacuation' | 'food_water' | 'medical' | 'other' | 'none';
  status: 'needs_verification' | 'active' | 'resolved';
}

import React from 'react';

export interface Facilities {
  food_water?: boolean;
  medical?: boolean;
  clothing?: boolean;
  electricity?: boolean;
  internet?: boolean;
}

export interface ContributionMarker extends BaseMarker {
  full_name: string;
  phone_number?: string;
  email?: string;
  contribution_type: 'shelter' | 'food_water' | 'medical' | 'clothing';
  capacity?: number;
  facilities?: Facilities;
  quantity?: number;
  unit?: string;
  show_contact_info?: boolean;
}

// Props interfaces
export interface MarkerPopupProps {
  formatDate: (dateString: string) => string;
  marker: EmergencyMarker | ContributionMarker;
  renderFacilities?: (facilities: Facilities) => React.ReactNode | null;
}

export interface EmergencyMarkersProps {
  formatDate: (dateString: string) => string;
}

export interface ContributionMarkersProps {
  formatDate: (dateString: string) => string;
  renderFacilities: (facilities: Facilities) => React.ReactNode | null;
}