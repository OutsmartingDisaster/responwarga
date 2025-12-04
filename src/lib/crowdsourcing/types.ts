export interface CrowdsourceProject {
  id: string;
  title: string;
  description?: string;
  disaster_type?: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  location_name?: string;
  latitude?: number;
  longitude?: number;
  geofence_radius_km?: number;
  geofence_level?: 'radius' | 'kelurahan' | 'kecamatan' | 'kabupaten' | 'provinsi';
  geofence_area_name?: string;
  geofence_polygon?: { lat: number; lng: number }[];
  allow_photo: boolean;
  allow_video: boolean;
  max_file_size_mb: number;
  require_location: boolean;
  auto_approve: boolean;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CrowdsourceSubmission {
  id: string;
  project_id: string;
  submitter_name: string;
  submitter_email: string;
  submitter_whatsapp: string;
  media_type: 'photo' | 'video';
  media_url: string;
  thumbnail_url?: string;
  caption: string;
  latitude: number;
  longitude: number;
  address: string;
  address_detail?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  device_info?: Record<string, any>;
  submitted_at: string;
}

export interface SubmitFormData {
  media_type: 'photo' | 'video';
  caption: string;
  latitude: number;
  longitude: number;
  address: string;
  address_detail?: string;
  submitter_name: string;
  submitter_email: string;
  submitter_whatsapp: string;
}
