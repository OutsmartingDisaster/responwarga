-- Migration: Add disaster_response_id to daily_logs and related tables

ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS disaster_response_id uuid REFERENCES disaster_responses(id);

ALTER TABLE responder_logs
  ADD COLUMN IF NOT EXISTS disaster_response_id uuid REFERENCES disaster_responses(id);

ALTER TABLE inventory_logs
  ADD COLUMN IF NOT EXISTS disaster_response_id uuid REFERENCES disaster_responses(id);

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS disaster_response_id uuid REFERENCES disaster_responses(id);

ALTER TABLE delivery_logs
  ADD COLUMN IF NOT EXISTS disaster_response_id uuid REFERENCES disaster_responses(id);
