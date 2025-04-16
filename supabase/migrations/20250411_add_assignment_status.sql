-- Migration: Add assignment, status, and shelter fields to emergencies and contributions

-- Emergencies table
ALTER TABLE emergencies
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Contributions table
ALTER TABLE contributions
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50),
ADD COLUMN IF NOT EXISTS shelter VARCHAR(100);
