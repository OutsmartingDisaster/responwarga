-- Function to get emergency reports within a radius
CREATE OR REPLACE FUNCTION get_reports_within_radius(center_lat double precision, center_lon double precision, radius_meters double precision)
RETURNS SETOF emergency_reports -- Returns matching rows from the table
LANGUAGE sql
STABLE -- Function doesn't modify the database
AS $$
  SELECT *
  FROM public.emergency_reports
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND
        ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography, -- Marker location
          ST_MakePoint(center_lon, center_lat)::geography, -- Center point (field post)
          radius_meters -- Radius in meters
        );
$$;

-- Function to get contributions within a radius (using the public view)
CREATE OR REPLACE FUNCTION get_contributions_within_radius(center_lat double precision, center_lon double precision, radius_meters double precision)
RETURNS SETOF contributions_public -- Returns matching rows from the view
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.contributions_public -- Query the view to respect column RLS
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND
        ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography, -- Marker location
          ST_MakePoint(center_lon, center_lat)::geography, -- Center point (field post)
          radius_meters -- Radius in meters
        );
$$;

-- Grant execution permission to authenticated users (and anon if needed)
GRANT EXECUTE ON FUNCTION get_reports_within_radius(double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contributions_within_radius(double precision, double precision, double precision) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_reports_within_radius(double precision, double precision, double precision) TO anon; -- If anonymous users need geofencing
-- GRANT EXECUTE ON FUNCTION get_contributions_within_radius(double precision, double precision, double precision) TO anon; -- If anonymous users need geofencing 