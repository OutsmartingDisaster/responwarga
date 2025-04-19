-- Set default value for status column in emergency_reports to 'menunggu'
ALTER TABLE public.emergency_reports ALTER COLUMN status SET DEFAULT 'menunggu';

-- Note: This doesn't change existing rows. If any existing rows have NULL
-- or 'pending', they might need manual updating depending on application logic.
-- UPDATE public.emergency_reports SET status = 'menunggu' WHERE status IS NULL OR status = 'pending'; 