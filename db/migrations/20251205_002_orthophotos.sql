-- Orthophoto management for aerial imagery
-- Migration: 20251205_002_orthophotos.sql

CREATE TABLE IF NOT EXISTS orthophotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    disaster_type VARCHAR(50),
    disaster_event_id UUID, -- Link to specific disaster/operation if applicable
    
    -- File paths
    original_file_path TEXT, -- Original uploaded file
    processed_file_path TEXT, -- COG or tiled version
    thumbnail_path TEXT,
    
    -- Geographic bounds (WGS84)
    bounds_west NUMERIC(11,8),
    bounds_east NUMERIC(11,8),
    bounds_south NUMERIC(10,8),
    bounds_north NUMERIC(10,8),
    center_lat NUMERIC(10,8),
    center_lng NUMERIC(11,8),
    
    -- Metadata
    capture_date DATE,
    resolution_cm NUMERIC(8,2), -- Ground resolution in cm/pixel
    file_size_bytes BIGINT,
    width_px INTEGER,
    height_px INTEGER,
    format VARCHAR(20), -- 'geotiff', 'cog', 'xyz_tiles'
    crs VARCHAR(50) DEFAULT 'EPSG:4326',
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, ready, failed, archived
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT,
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    visibility VARCHAR(20) DEFAULT 'organization', -- 'public', 'organization', 'private'
    
    -- Audit
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orthophotos_org ON orthophotos(organization_id);
CREATE INDEX IF NOT EXISTS idx_orthophotos_status ON orthophotos(status);
CREATE INDEX IF NOT EXISTS idx_orthophotos_disaster ON orthophotos(disaster_type);
CREATE INDEX IF NOT EXISTS idx_orthophotos_bounds ON orthophotos(bounds_west, bounds_east, bounds_south, bounds_north);

-- Spatial index helper view for finding orthophotos covering a point
CREATE OR REPLACE VIEW orthophoto_coverage AS
SELECT 
    id, name, organization_id, disaster_type, status, visibility,
    bounds_west, bounds_east, bounds_south, bounds_north,
    center_lat, center_lng, thumbnail_path, capture_date
FROM orthophotos
WHERE status = 'ready';

-- Processing queue for background jobs
CREATE TABLE IF NOT EXISTS orthophoto_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orthophoto_id UUID REFERENCES orthophotos(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL, -- 'convert_cog', 'generate_tiles', 'extract_bounds', 'generate_thumbnail'
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orthophoto_queue_status ON orthophoto_processing_queue(status, priority DESC);

COMMENT ON TABLE orthophotos IS 'Orthophoto/aerial imagery metadata and file references';
COMMENT ON TABLE orthophoto_processing_queue IS 'Background processing queue for orthophoto conversion';
