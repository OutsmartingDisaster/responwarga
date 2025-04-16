-- Migration: Fix responder_id and delivered_by types to uuid

-- Drop dependent RLS policy
DROP POLICY IF EXISTS "Allow responders to manage own logs" ON public.responder_logs;

-- Drop and re-add responder_logs.responder_id as uuid
ALTER TABLE responder_logs
  DROP CONSTRAINT IF EXISTS responder_logs_responder_id_fkey,
  DROP COLUMN IF EXISTS responder_id;

ALTER TABLE responder_logs
  ADD COLUMN responder_id uuid REFERENCES profiles(id);

-- Re-create RLS policy
CREATE POLICY "Allow responders to manage own logs" ON public.responder_logs
  FOR ALL
  USING (responder_id = get_profile_id(auth.uid()))
  WITH CHECK (responder_id = get_profile_id(auth.uid()));

-- Drop and re-add delivery_logs.delivered_by as uuid
ALTER TABLE delivery_logs
  DROP CONSTRAINT IF EXISTS delivery_logs_delivered_by_fkey,
  DROP COLUMN IF EXISTS delivered_by;

ALTER TABLE delivery_logs
  ADD COLUMN delivered_by uuid REFERENCES profiles(id);
