-- Add disaster_response_id foreign key to emergency_reports table

ALTER TABLE public.emergency_reports
ADD COLUMN disaster_response_id uuid NULL;

ALTER TABLE public.emergency_reports
ADD CONSTRAINT emergency_reports_disaster_response_id_fkey
FOREIGN KEY (disaster_response_id)
REFERENCES public.disaster_responses(id)
ON DELETE SET NULL; -- Or ON DELETE CASCADE depending on desired behavior

COMMENT ON COLUMN public.emergency_reports.disaster_response_id IS 'Links the emergency report to a specific disaster response effort.';
