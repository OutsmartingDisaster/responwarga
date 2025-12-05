import { query } from '@/lib/db/pool';
import type { Incident, IncidentStatus, IncidentSourceType } from '@/types/incidents';
import type { DisasterType, DispatchStatus, Severity, Urgency } from '@/types/operations';

interface IncidentRow {
  id: string;
  source_type: string;
  organization_id: string | null;
  disaster_type: DisasterType | null;
  assistance_type: string | null;
  severity: Severity | null;
  urgency: Urgency | null;
  status: string | null;
  incident_status: IncidentStatus;
  dispatch_status: DispatchStatus | null;
  latitude: string | number | null;
  longitude: string | number | null;
  location_name: string | null;
  created_at: string;
  updated_at: string;
}

function toNumberOrNull(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapIncidentRow(row: IncidentRow): Incident {
  return {
    id: row.id,
    source_type: row.source_type as IncidentSourceType,
    organization_id: row.organization_id,
    disaster_type: row.disaster_type,
    assistance_type: row.assistance_type,
    severity: row.severity as Severity | null,
    urgency: row.urgency as Urgency | null,
    status: row.status,
    incident_status: row.incident_status,
    dispatch_status: row.dispatch_status,
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    location_name: row.location_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export interface IncidentListFilters {
  organizationId?: string;
  status?: IncidentStatus;
  sourceType?: IncidentSourceType;
  since?: string;
  limit?: number;
}

export async function listIncidents(filters: IncidentListFilters = {}): Promise<Incident[]> {
  let sql = 'SELECT * FROM incident_events WHERE 1=1';
  const params: any[] = [];
  let index = 1;

  if (filters.organizationId) {
    sql += ` AND organization_id = $${index++}`;
    params.push(filters.organizationId);
  }

  if (filters.status) {
    sql += ` AND incident_status = $${index++}`;
    params.push(filters.status);
  }

  if (filters.sourceType) {
    sql += ` AND source_type = $${index++}`;
    params.push(filters.sourceType);
  }

  if (filters.since) {
    sql += ` AND created_at >= $${index++}`;
    params.push(filters.since);
  }

  sql += ' ORDER BY created_at DESC';

  if (typeof filters.limit === 'number') {
    sql += ` LIMIT $${index++}`;
    params.push(filters.limit);
  }

  const { rows } = await query<IncidentRow>(sql, params);
  return rows.map(mapIncidentRow);
}
