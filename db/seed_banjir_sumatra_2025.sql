-- Seed: Project Banjir Sumatra 2025
-- Run this in your database to create the project

-- 1. Create the project
INSERT INTO crowdsource_projects (
  title, description, disaster_type, status,
  location_name, latitude, longitude,
  geofence_level, use_multi_zone,
  allow_photo, allow_video, max_file_size_mb,
  require_location, auto_approve
) VALUES (
  'Banjir Sumatra 2025',
  'Dokumentasi dampak banjir di Provinsi Aceh, Sumatera Utara, dan Sumatera Barat. Bantu kami mengumpulkan foto dan video kondisi terkini untuk koordinasi bantuan.',
  'flood', 'active',
  'Sumatra Bagian Utara', 2.0, 99.0,
  'provinsi', true,
  true, true, 50,
  true, false
);

-- Get the project ID (run this separately to get the ID)
-- SELECT id FROM crowdsource_projects WHERE title = 'Banjir Sumatra 2025';

-- 2. Create zones (3 provinsi) - replace PROJECT_ID with actual ID
DO $$
DECLARE
  proj_id UUID;
BEGIN
  SELECT id INTO proj_id FROM crowdsource_projects WHERE title = 'Banjir Sumatra 2025' LIMIT 1;
  
  -- Zone 1: Aceh
  INSERT INTO crowdsource_geofence_zones (project_id, zone_name, latitude, longitude, zone_level, display_order)
  VALUES (proj_id, 'Provinsi Aceh', 4.6951, 96.7494, 'provinsi', 0);
  
  -- Zone 2: Sumatera Utara
  INSERT INTO crowdsource_geofence_zones (project_id, zone_name, latitude, longitude, zone_level, display_order)
  VALUES (proj_id, 'Provinsi Sumatera Utara', 2.1154, 99.5451, 'provinsi', 1);
  
  -- Zone 3: Sumatera Barat
  INSERT INTO crowdsource_geofence_zones (project_id, zone_name, latitude, longitude, zone_level, display_order)
  VALUES (proj_id, 'Provinsi Sumatera Barat', -0.7399, 100.8000, 'provinsi', 2);
  
  -- 3. Create form fields
  -- Field 1: Nama
  INSERT INTO crowdsource_form_fields (project_id, field_name, field_label, field_type, placeholder, helper_text, is_required, display_order)
  VALUES (proj_id, 'nama_pengirim', 'Nama Lengkap', 'text', 'Nama Anda', 'Nama akan ditampilkan sebagai kontributor', true, 0);
  
  -- Field 2: Email
  INSERT INTO crowdsource_form_fields (project_id, field_name, field_label, field_type, placeholder, helper_text, is_required, display_order)
  VALUES (proj_id, 'email', 'Email', 'email', 'email@contoh.com', 'Untuk verifikasi dan notifikasi', true, 1);
  
  -- Field 3: Tanggal Dokumentasi
  INSERT INTO crowdsource_form_fields (project_id, field_name, field_label, field_type, placeholder, helper_text, is_required, display_order)
  VALUES (proj_id, 'tanggal_dokumentasi', 'Tanggal Dokumentasi Dibuat', 'date', '', 'Kapan foto/video ini diambil?', true, 2);
  
  -- Field 4: Link Media (untuk file besar)
  INSERT INTO crowdsource_form_fields (project_id, field_name, field_label, field_type, placeholder, helper_text, is_required, display_order)
  VALUES (proj_id, 'link_media', 'Link Foto/Video Tambahan', 'url', 'https://drive.google.com/... atau https://youtube.com/...', 'Jika file terlalu besar (>50MB), upload ke Google Drive/YouTube lalu paste linknya di sini', false, 3);
  
  RAISE NOTICE 'Project Banjir Sumatra 2025 created with ID: %', proj_id;
END $$;

-- Verify
SELECT 
  p.id, p.title, p.status,
  (SELECT COUNT(*) FROM crowdsource_geofence_zones WHERE project_id = p.id) as zones,
  (SELECT COUNT(*) FROM crowdsource_form_fields WHERE project_id = p.id) as fields
FROM crowdsource_projects p 
WHERE p.title = 'Banjir Sumatra 2025';
