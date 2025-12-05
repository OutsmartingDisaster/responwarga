import type { DisasterType, DispatchStatus, Severity, Urgency } from './operations';

export type IncidentSourceType = 'emergency_report' | 'crowdsource_submission';

export type IncidentStatus = 'open' | 'in_review' | 'resolved';

export interface Incident {
  id: string;
  source_type: IncidentSourceType;
  organization_id: string | null;
  disaster_type: DisasterType | null;
  assistance_type: string | null;
  severity: Severity | null;
  urgency: Urgency | null;
  status: string | null;
  incident_status: IncidentStatus;
  dispatch_status: DispatchStatus | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  created_at: string;
  updated_at: string;
}
