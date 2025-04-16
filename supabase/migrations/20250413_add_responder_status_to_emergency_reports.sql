-- Migration: Add responder_status field to emergency_reports for granular responder-side status updates

ALTER TABLE emergency_reports
ADD COLUMN IF NOT EXISTS responder_status VARCHAR(32) 
  CHECK (responder_status IN ('diterima', 'sedang_berjalan', 'selesai', 'batal')) 
  DEFAULT NULL;
