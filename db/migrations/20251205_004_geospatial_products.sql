-- Derived geospatial products from orthophotos
-- Migration: 20251205_004_geospatial_products.sql

-- Vector layers derived from orthophotos (flood extent, damage footprints, etc.)
CREATE TABLE IF NOT EXISTS derived_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orthophoto_id UUID REFERENCES orthophotos(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Layer info
    name VARCHAR(255) NOT NULL,
    layer_type VARCHAR(50) NOT NULL, -- 'flood_extent', 'damage_footprint', 'road_blockage', 'shelter_area', 'custom'
    description TEXT,
    
    -- GeoJSON data
    geojson JSONB NOT NULL,
    feature_count INTEGER DEFAULT 0,
    
    -- Bounds (WGS84)
    bounds_west NUMERIC(11,8),
    bounds_east NUMERIC(11,8),
    bounds_south NUMERIC(10,8),
    bounds_north NUMERIC(10,8),
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'auto_detected', 'imported'
    confidence_score NUMERIC(5,2), -- For auto-detected layers (0-100)
    disaster_event_id UUID,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'draft'
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_derived_vectors_ortho ON derived_vectors(orthophoto_id);
CREATE INDEX IF NOT EXISTS idx_derived_vectors_org ON derived_vectors(organization_id);
CREATE INDEX IF NOT EXISTS idx_derived_vectors_type ON derived_vectors(layer_type);
CREATE INDEX IF NOT EXISTS idx_derived_vectors_status ON derived_vectors(status);

-- Tile cache for orthophotos (XYZ tiles)
CREATE TABLE IF NOT EXISTS orthophoto_tiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orthophoto_id UUID REFERENCES orthophotos(id) ON DELETE CASCADE,
    
    -- Tile coordinates (XYZ scheme)
    z INTEGER NOT NULL, -- Zoom level
    x INTEGER NOT NULL, -- Column
    y INTEGER NOT NULL, -- Row
    
    -- Tile data
    tile_path TEXT, -- Path to tile file (PNG/WebP)
    tile_size_bytes INTEGER,
    
    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(orthophoto_id, z, x, y)
);

CREATE INDEX IF NOT EXISTS idx_ortho_tiles_lookup ON orthophoto_tiles(orthophoto_id, z, x, y);

-- Tile generation queue
CREATE TABLE IF NOT EXISTS tile_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orthophoto_id UUID REFERENCES orthophotos(id) ON DELETE CASCADE,
    min_zoom INTEGER DEFAULT 10,
    max_zoom INTEGER DEFAULT 18,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    progress INTEGER DEFAULT 0, -- 0-100
    total_tiles INTEGER,
    generated_tiles INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tile_queue_status ON tile_generation_queue(status);

COMMENT ON TABLE derived_vectors IS 'Vector layers derived from orthophoto analysis';
COMMENT ON TABLE orthophoto_tiles IS 'Cached XYZ tiles for orthophoto delivery';
COMMENT ON TABLE tile_generation_queue IS 'Queue for tile generation jobs';
