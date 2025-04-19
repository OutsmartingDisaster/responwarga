-- Remove obsolete title and amount columns from contributions table
ALTER TABLE public.contributions
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS amount; 