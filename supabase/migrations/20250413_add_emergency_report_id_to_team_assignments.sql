-- Migration: Add emergency_report_id to team_assignments for linking assignments to emergency reports

ALTER TABLE team_assignments
ADD COLUMN IF NOT EXISTS emergency_report_id integer REFERENCES emergency_reports(id);

CREATE INDEX IF NOT EXISTS idx_team_assignments_emergency_report ON team_assignments(emergency_report_id);
