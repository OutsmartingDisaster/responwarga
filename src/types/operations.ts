// Types for Response Operations System

// ============================================
// Disaster Types
// ============================================
export const DISASTER_TYPES = {
  flood: 'Banjir',
  flash_flood: 'Banjir Bandang',
  tidal_flood: 'Banjir Rob',
  earthquake: 'Gempa Bumi',
  landslide: 'Tanah Longsor',
  fire: 'Kebakaran',
  forest_fire: 'Kebakaran Hutan',
  tsunami: 'Tsunami',
  volcanic: 'Gunung Berapi',
  cyclone: 'Siklon',
  tornado: 'Angin Puting Beliung',
  extreme_weather: 'Cuaca Ekstrim'
} as const;

export type DisasterType = keyof typeof DISASTER_TYPES;

// ============================================
// Field Report Categories
// ============================================
export const FIELD_REPORT_CATEGORIES = {
  aid_delivery: 'Dropping Bantuan',
  field_condition: 'Kondisi Lapangan',
  incident: 'Insiden'
} as const;

export type FieldReportCategory = keyof typeof FIELD_REPORT_CATEGORIES;

// Aid Delivery Subcategories
export const AID_DELIVERY_SUBCATEGORIES = {
  food_distribution: 'Distribusi Makanan',
  water_distribution: 'Distribusi Air Bersih',
  medical_supplies: 'Obat-obatan & Alat Medis',
  clothing: 'Pakaian & Selimut',
  shelter_materials: 'Tenda/Terpal',
  other_aid: 'Bantuan Lainnya'
} as const;

// Field Condition Subcategories by Disaster Type
export const FIELD_CONDITION_BY_DISASTER: Record<DisasterType, string[]> = {
  flood: ['water_level', 'road_flooded', 'building_flooded', 'evacuation_needed'],
  flash_flood: ['water_level', 'road_flooded', 'building_flooded', 'evacuation_needed', 'debris'],
  tidal_flood: ['water_level', 'road_flooded', 'building_flooded'],
  earthquake: ['building_damage', 'road_crack', 'bridge_damage', 'aftershock', 'trapped_victim'],
  landslide: ['road_blocked', 'building_buried', 'evacuation_needed', 'unstable_area'],
  fire: ['fire_spread', 'building_burned', 'evacuation_needed', 'smoke_hazard'],
  forest_fire: ['fire_spread', 'smoke_hazard', 'evacuation_needed', 'wildlife_affected'],
  tsunami: ['water_level', 'building_damage', 'debris', 'evacuation_needed'],
  volcanic: ['lava_flow', 'ash_fall', 'evacuation_needed', 'air_quality'],
  cyclone: ['building_damage', 'road_blocked', 'power_outage', 'flooding'],
  tornado: ['building_damage', 'road_blocked', 'debris', 'power_outage'],
  extreme_weather: ['flooding', 'road_blocked', 'power_outage', 'building_damage']
};

export const SUBCATEGORY_LABELS: Record<string, string> = {
  // Water conditions
  water_level: 'Ketinggian Air',
  road_flooded: 'Jalan Terendam',
  building_flooded: 'Bangunan Terendam',
  flooding: 'Banjir',
  
  // Damage
  building_damage: 'Kerusakan Bangunan',
  building_burned: 'Bangunan Terbakar',
  building_buried: 'Bangunan Tertimbun',
  road_crack: 'Jalan Retak',
  road_blocked: 'Jalan Terputus',
  bridge_damage: 'Jembatan Rusak',
  
  // Hazards
  debris: 'Puing/Material',
  fire_spread: 'Penyebaran Api',
  smoke_hazard: 'Bahaya Asap',
  lava_flow: 'Aliran Lava',
  ash_fall: 'Hujan Abu',
  air_quality: 'Kualitas Udara',
  unstable_area: 'Area Tidak Stabil',
  aftershock: 'Gempa Susulan',
  
  // Evacuation
  evacuation_needed: 'Butuh Evakuasi',
  trapped_victim: 'Korban Terjebak',
  
  // Utilities
  power_outage: 'Listrik Padam',
  
  // Other
  wildlife_affected: 'Satwa Terdampak'
};

// Incident Subcategories
export const INCIDENT_SUBCATEGORIES = {
  medical_emergency: 'Darurat Medis',
  rescue_needed: 'Butuh Evakuasi/Penyelamatan',
  security_issue: 'Masalah Keamanan',
  crowd_gathering: 'Kerumunan/Pengungsian',
  other_incident: 'Insiden Lainnya'
} as const;

// ============================================
// Status Types
// ============================================
export type OperationStatus = 'active' | 'completed' | 'suspended';
export type TeamMemberStatus = 'invited' | 'accepted' | 'declined';
export type TeamMemberRole = 'coordinator' | 'responder';
export type AssignmentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined';
export type AssignmentPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DispatchStatus = 'unassigned' | 'dispatched' | 'acknowledged' | 'assigned' | 'in_progress' | 'resolved';
export type Severity = 'mild' | 'moderate' | 'severe';
export type Urgency = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// Notification Types
// ============================================
export type NotificationType = 
  | 'team_invitation'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'new_assignment'
  | 'assignment_accepted'
  | 'assignment_completed'
  | 'new_field_report'
  | 'new_report_dispatched'
  | 'report_unassigned';

// ============================================
// Entity Interfaces
// ============================================

export interface ResponseOperation {
  id: string;
  organization_id: string;
  name: string;
  disaster_type: DisasterType;
  description?: string;
  
  // Disaster location
  disaster_location_name: string;
  disaster_lat: number;
  disaster_lng: number;
  disaster_radius_km: number;
  
  // Posko location
  posko_name?: string;
  posko_address?: string;
  posko_lat?: number;
  posko_lng?: number;
  
  // Status
  status: OperationStatus;
  created_by?: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations (optional, for joined queries)
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  organization_name?: string;
  organization_slug?: string;
  team_members?: ResponseTeamMember[];
  team_count?: number;
  field_reports_count?: number;
  assignments_count?: number;
}

export interface ResponseTeamMember {
  id: string;
  response_operation_id: string;
  user_id: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  
  // Relations (optional, for joined queries)
  user?: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
  };
  inviter?: {
    id: string;
    full_name: string;
  };
}

export interface FieldReport {
  id: string;
  response_operation_id: string;
  reported_by: string;
  
  category: FieldReportCategory;
  subcategory?: string;
  
  title: string;
  description?: string;
  
  location_name?: string;
  latitude?: number;
  longitude?: number;
  
  severity?: Severity;
  urgency?: Urgency;
  affected_count?: number;
  quantity_delivered?: string;
  
  photos: string[];
  
  created_at: string;
  updated_at: string;
  
  // Relations (optional, for joined queries)
  reporter?: {
    id: string;
    full_name: string;
  };
  operation?: ResponseOperation;
}

export interface ReportAssignment {
  id: string;
  report_id: string;
  response_operation_id: string;
  assigned_to: string;
  assigned_by: string;
  
  status: AssignmentStatus;
  priority: AssignmentPriority;
  
  notes?: string;
  response_notes?: string;
  
  assigned_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  
  // Relations (optional, for joined queries)
  report?: {
    id: string;
    full_name: string;
    description: string;
    assistance_type: string;
    latitude: number;
    longitude: number;
  };
  assignee?: {
    id: string;
    full_name: string;
    phone?: string;
  };
  assigner?: {
    id: string;
    full_name: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  reference_type?: string;
  reference_id?: string;
  read_at?: string;
  created_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateOperationRequest {
  name: string;
  disaster_type: DisasterType;
  description?: string;
  disaster_location_name: string;
  disaster_lat: number;
  disaster_lng: number;
  disaster_radius_km?: number;
  posko_name?: string;
  posko_address?: string;
  posko_lat?: number;
  posko_lng?: number;
}

export interface UpdateOperationRequest {
  name?: string;
  description?: string;
  disaster_radius_km?: number;
  posko_name?: string;
  posko_address?: string;
  posko_lat?: number;
  posko_lng?: number;
  status?: OperationStatus;
}

export interface InviteTeamMemberRequest {
  user_id: string;
  role?: TeamMemberRole;
}

export interface CreateFieldReportRequest {
  category: FieldReportCategory;
  subcategory?: string;
  title: string;
  description?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  severity?: Severity;
  urgency?: Urgency;
  affected_count?: number;
  quantity_delivered?: string;
  photos?: string[];
}

export interface CreateAssignmentRequest {
  report_id: string;
  assigned_to: string;
  priority?: AssignmentPriority;
  notes?: string;
}

export interface UpdateAssignmentRequest {
  status?: AssignmentStatus;
  response_notes?: string;
}

// ============================================
// Dispatch Types
// ============================================

export interface DispatchResult {
  dispatched: boolean;
  operation_id?: string;
  organization_id?: string;
  distance_km?: number;
  message: string;
}
