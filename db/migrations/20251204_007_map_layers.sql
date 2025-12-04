-- Migration: Map Layers for Crowdsource Projects
-- Date: 2025-12-04
-- Description: Support orthophoto overlays and analysis layers

-- Map layers table
CREATE TABLE IF NOT EXISTS crowdsource_map_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  -- Layer info
  layer_name VARCHAR(255) NOT NULL,
  layer_type VARCHAR(50) NOT NULL CHECK (layer_type IN ('orthophoto', 'geotiff', 'geojson', 'analysis', 'boundary')),
  description TEXT,
  
  -- Source
  source_url TEXT, -- URL to GeoTIFF, GeoJSON, or tile server
  source_type VARCHAR(50) CHECK (source_type IN ('file', 'url', 'tiles', 'wms')),
  
  -- Bounds (for positioning)
  bounds_north DECIMAL(10, 8),
  bounds_south DECIMAL(10, 8),
  bounds_east DECIMAL(11, 8),
  bounds_west DECIMAL(11, 8),
  
  -- Display
  opacity DECIMAL(3, 2) DEFAULT 0.7,
  z_index INT DEFAULT 1,
  is_visible BOOLEAN DEFAULT true,
  is_default_on BOOLEAN DEFAULT false, -- Show by default when page loads
  
  -- Metadata
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_layers_project ON crowdsource_map_layers(project_id);

-- Regional statistics view (for dashboard per daerah)
CREATE TABLE IF NOT EXISTS crowdsource_regional_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  region_name VARCHAR(255) NOT NULL,
  region_level VARCHAR(20) CHECK (region_level IN ('provinsi', 'kabupaten', 'kecamatan', 'kelurahan')),
  region_code VARCHAR(50),
  
  -- Stats (updated periodically or via trigger)
  total_submissions INT DEFAULT 0,
  photo_count INT DEFAULT 0,
  video_count INT DEFAULT 0,
  approved_count INT DEFAULT 0,
  pending_count INT DEFAULT 0,
  
  -- Bounds for map focus
  center_lat DECIMAL(10, 8),
  center_lng DECIMAL(11, 8),
  
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regional_stats_project ON crowdsource_regional_stats(project_id);

COMMENT ON TABLE crowdsource_map_layers IS 'Map overlay layers like orthophoto, GeoTIFF, analysis polygons';
COMMENT ON TABLE crowdsource_regional_stats IS 'Aggregated statistics per region for dashboard';
