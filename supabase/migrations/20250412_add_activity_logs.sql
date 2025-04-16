-- Migration: Add activity_logs table for responder daily activity (5W1H)

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id uuid REFERENCES daily_logs(id),
  responder_id uuid REFERENCES profiles(id),
  what TEXT,
  when_time TIMESTAMP WITH TIME ZONE,
  where_location TEXT,
  why TEXT,
  how TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
