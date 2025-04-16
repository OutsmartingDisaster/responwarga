-- Migration: Create daily log tables for organization disaster response

-- Table for daily logs (one per org per day)
CREATE TABLE IF NOT EXISTS daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  date date NOT NULL,
  field_command_location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for responder check-in/out logs
CREATE TABLE IF NOT EXISTS responder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id uuid REFERENCES daily_logs(id),
  responder_id integer REFERENCES profiles(id),
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_in_location TEXT,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_out_location TEXT,
  notes TEXT
);

-- Table for inventory logs
CREATE TABLE IF NOT EXISTS inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id uuid REFERENCES daily_logs(id),
  item_name TEXT NOT NULL,
  quantity_start INT,
  quantity_received INT,
  quantity_delivered INT,
  quantity_end INT,
  notes TEXT
);

-- Table for delivery logs
CREATE TABLE IF NOT EXISTS delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id uuid REFERENCES daily_logs(id),
  item_name TEXT NOT NULL,
  quantity INT,
  destination TEXT,
  delivered_by integer REFERENCES profiles(id),
  notes TEXT
);
