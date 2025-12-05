-- Migration: Unified Incident Events View
-- Date: 2025-12-05
-- Description: Create view incident_events unifying emergency_reports and crowdsource_submissions

CREATE OR REPLACE VIEW incident_events AS
SELECT
  er.id AS id,
  'emergency_report'::text AS source_type,
  er.assigned_organization_id AS organization_id,
  er.disaster_type,
  er.assistance_type,
  NULL::text AS severity,
  NULL::text AS urgency,
  er.status AS status,
  CASE
    WHEN er.dispatch_status IN ('unassigned', 'dispatched', 'acknowledged') THEN 'open'
    WHEN er.dispatch_status IN ('assigned', 'in_progress') THEN 'in_review'
    WHEN er.dispatch_status = 'resolved' THEN 'resolved'
    ELSE 'open'
  END::text AS incident_status,
  er.dispatch_status,
  er.latitude,
  er.longitude,
  COALESCE(er.location, er.address) AS location_name,
  er.created_at,
  er.updated_at
FROM emergency_reports er

UNION ALL

SELECT
  cs.id AS id,
  'crowdsource_submission'::text AS source_type,
  NULL::uuid AS organization_id,
  cp.disaster_type,
  NULL::text AS assistance_type,
  NULL::text AS severity,
  NULL::text AS urgency,
  cs.status AS status,
  CASE
    WHEN cs.status = 'pending' THEN 'open'
    WHEN cs.status IN ('approved', 'flagged') THEN 'in_review'
    WHEN cs.status = 'rejected' THEN 'resolved'
    ELSE 'open'
  END::text AS incident_status,
  NULL::text AS dispatch_status,
  cs.latitude,
  cs.longitude,
  cs.address AS location_name,
  cs.submitted_at AS created_at,
  cs.submitted_at AS updated_at
FROM crowdsource_submissions cs
LEFT JOIN crowdsource_projects cp ON cp.id = cs.project_id;
