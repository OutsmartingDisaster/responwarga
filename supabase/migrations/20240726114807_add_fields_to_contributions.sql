-- ALTER TABLE public.contributions ADD CONSTRAINT contributions_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Update the RLS policies if needed to grant access to the new columns
-- Example: Allow select for all users on new columns (adjust as needed)
-- DROP POLICY IF EXISTS "Allow public read access" ON public.contributions;
-- CREATE POLICY "Allow public read access" ON public.contributions FOR SELECT USING (true);

-- Update the status check constraint to include assigned and verified
ALTER TABLE public.contributions DROP CONSTRAINT IF EXISTS contributions_status_check;
ALTER TABLE public.contributions ADD CONSTRAINT contributions_status_check CHECK (status = ANY (ARRAY['menunggu'::text, 'disetujui'::text, 'dikirim'::text, 'dibatalkan'::text, 'assigned'::text, 'verified'::text]));

-- Remove the potentially unused 'title' and 'amount' columns if they are truly replaced
-- ALTER TABLE public.contributions DROP COLUMN IF EXISTS title;
-- ALTER TABLE public.contributions DROP COLUMN IF EXISTS amount; 