-- Add missing columns to the contributions table based on frontend usage

ALTER TABLE public.contributions
ADD COLUMN IF NOT EXISTS full_name text NOT NULL,
ADD COLUMN IF NOT EXISTS phone_number text NOT NULL,
ADD COLUMN IF NOT EXISTS email text NOT NULL,
ADD COLUMN IF NOT EXISTS address text, -- Making address nullable as geocoding might fail
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS show_contact_info boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS capacity integer,
ADD COLUMN IF NOT EXISTS facilities jsonb,
ADD COLUMN IF NOT EXISTS quantity integer,
ADD COLUMN IF NOT EXISTS unit text;

-- Add constraints if necessary, e.g., for email format or phone number (optional)
-- ALTER TABLE public.contributions ADD CONSTRAINT contributions_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Update the RLS policies if needed to grant access to the new columns
-- Example: Allow select for all users on new columns (adjust as needed)
-- DROP POLICY IF EXISTS "Allow public read access" ON public.contributions;
-- CREATE POLICY "Allow public read access" ON public.contributions FOR SELECT USING (true);

-- Consider updating the status check constraint if needed, or handle in frontend.
-- Example: Add 'active' and 'koordinasi_relawan' to allowed statuses
-- ALTER TABLE public.contributions DROP CONSTRAINT IF EXISTS contributions_status_check;
-- ALTER TABLE public.contributions ADD CONSTRAINT contributions_status_check CHECK (status = ANY (ARRAY['menunggu'::text, 'disetujui'::text, 'dikirim'::text, 'dibatalkan'::text, 'active'::text, 'koordinasi_relawan'::text]));

-- Remove the potentially unused 'title' and 'amount' columns if they are truly replaced
-- ALTER TABLE public.contributions DROP COLUMN IF EXISTS title;
-- ALTER TABLE public.contributions DROP COLUMN IF EXISTS amount; 