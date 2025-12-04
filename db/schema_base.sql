--
-- PostgreSQL database dump
--

\restrict JHQen03TokRQaVcliYHN3LaAQmLFz7nJCZCXKEK0LI1vJ16Wc2ilzy2Ur5LAhDC

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: find_operations_within_radius(numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_operations_within_radius(p_lat numeric, p_lng numeric) RETURNS TABLE(operation_id uuid, organization_id uuid, distance_km numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ro.id as operation_id,
    ro.organization_id,
    (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(ro.disaster_lat)) *
        cos(radians(ro.disaster_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(ro.disaster_lat))
      )
    )::DECIMAL as distance_km
  FROM response_operations ro
  WHERE ro.status = 'active'
    AND (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(ro.disaster_lat)) *
        cos(radians(ro.disaster_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(ro.disaster_lat))
      )
    ) <= ro.disaster_radius_km
  ORDER BY distance_km ASC;
END;
$$;


--
-- Name: update_crowdsource_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_crowdsource_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: about_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.about_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    active boolean DEFAULT false
);


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    activity_type text,
    activity_details text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255),
    role character varying(50) DEFAULT 'admin'::character varying,
    is_super_admin boolean DEFAULT false,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    responder_id uuid NOT NULL,
    disaster_response_id uuid,
    emergency_report_id uuid,
    contribution_id uuid,
    status character varying(50) DEFAULT 'assigned'::character varying NOT NULL,
    notes text,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    action character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: banner_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banner_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_enabled boolean DEFAULT true,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid
);


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    active boolean DEFAULT false
);


--
-- Name: contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contributor_id uuid,
    full_name character varying(255),
    phone_number character varying(50),
    email character varying(255),
    address text,
    contribution_type text,
    description text,
    capacity character varying(50),
    facilities jsonb,
    quantity character varying(50),
    unit character varying(50),
    latitude numeric(10,8),
    longitude numeric(11,8),
    photo_url text,
    status text,
    show_contact_info boolean DEFAULT false,
    consent_statement text,
    verified_by uuid,
    verified_at timestamp(6) with time zone,
    assigned_shelter_id uuid,
    status_updated_by uuid,
    status_updated_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    dispatched_to uuid,
    dispatched_at timestamp with time zone,
    dispatch_status character varying(50) DEFAULT 'unassigned'::character varying,
    acknowledged_at timestamp with time zone,
    CONSTRAINT contributions_dispatch_status_check CHECK (((dispatch_status)::text = ANY ((ARRAY['unassigned'::character varying, 'dispatched'::character varying, 'acknowledged'::character varying, 'connected'::character varying])::text[])))
);


--
-- Name: crowdsource_form_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crowdsource_form_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    field_name character varying(100) NOT NULL,
    field_label character varying(255) NOT NULL,
    field_type character varying(50) NOT NULL,
    placeholder character varying(255),
    helper_text character varying(500),
    options jsonb,
    is_required boolean DEFAULT false,
    min_length integer,
    max_length integer,
    min_value numeric,
    max_value numeric,
    pattern character varying(255),
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    max_file_size_mb integer DEFAULT 10,
    allowed_formats jsonb,
    CONSTRAINT crowdsource_form_fields_field_type_check CHECK (((field_type)::text = ANY ((ARRAY['text'::character varying, 'textarea'::character varying, 'number'::character varying, 'select'::character varying, 'checkbox'::character varying, 'radio'::character varying, 'date'::character varying, 'time'::character varying, 'email'::character varying, 'phone'::character varying, 'url'::character varying, 'address'::character varying, 'photo'::character varying, 'video'::character varying, 'media'::character varying])::text[])))
);


--
-- Name: TABLE crowdsource_form_fields; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crowdsource_form_fields IS 'Custom form fields for crowdsource projects';


--
-- Name: COLUMN crowdsource_form_fields.options; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_form_fields.options IS 'JSON array of options for select/radio/checkbox fields';


--
-- Name: COLUMN crowdsource_form_fields.max_file_size_mb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_form_fields.max_file_size_mb IS 'Maximum file size in MB for media uploads';


--
-- Name: COLUMN crowdsource_form_fields.allowed_formats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_form_fields.allowed_formats IS 'JSON array of allowed file formats e.g. ["jpg", "png", "mp4"]';


--
-- Name: crowdsource_geofence_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crowdsource_geofence_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    zone_name character varying(255) NOT NULL,
    zone_level character varying(20),
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    radius_km numeric(5,2) DEFAULT 5.0,
    admin_area_code character varying(50),
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crowdsource_geofence_zones_zone_level_check CHECK (((zone_level)::text = ANY ((ARRAY['radius'::character varying, 'kelurahan'::character varying, 'kecamatan'::character varying, 'kabupaten'::character varying, 'provinsi'::character varying])::text[])))
);


--
-- Name: TABLE crowdsource_geofence_zones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crowdsource_geofence_zones IS 'Multiple geofence zones for crowdsource projects';


--
-- Name: crowdsource_map_layers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crowdsource_map_layers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    layer_name character varying(255) NOT NULL,
    layer_type character varying(50) NOT NULL,
    description text,
    source_url text,
    source_type character varying(50),
    bounds_north numeric(10,8),
    bounds_south numeric(10,8),
    bounds_east numeric(11,8),
    bounds_west numeric(11,8),
    opacity numeric(3,2) DEFAULT 0.7,
    z_index integer DEFAULT 1,
    is_visible boolean DEFAULT true,
    is_default_on boolean DEFAULT false,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crowdsource_map_layers_layer_type_check CHECK (((layer_type)::text = ANY ((ARRAY['orthophoto'::character varying, 'geotiff'::character varying, 'geojson'::character varying, 'analysis'::character varying, 'boundary'::character varying])::text[]))),
    CONSTRAINT crowdsource_map_layers_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['file'::character varying, 'url'::character varying, 'tiles'::character varying, 'wms'::character varying])::text[])))
);


--
-- Name: TABLE crowdsource_map_layers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crowdsource_map_layers IS 'Map overlay layers like orthophoto, GeoTIFF, analysis polygons';


--
-- Name: crowdsource_moderator_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crowdsource_moderator_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    can_approve boolean DEFAULT true,
    can_reject boolean DEFAULT true,
    can_flag boolean DEFAULT true,
    can_export boolean DEFAULT false,
    invite_token character varying(64) NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    accepted_at timestamp with time zone
);


--
-- Name: crowdsource_moderators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crowdsource_moderators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    can_approve boolean DEFAULT true,
    can_reject boolean DEFAULT true,
    can_flag boolean DEFAULT true,
    can_export boolean DEFAULT false,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    CONSTRAINT crowdsource_moderators_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'revoked'::character varying])::text[])))
);


--
-- Name: crowdsource_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crowdsource_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    disaster_type character varying(50),
    status character varying(20) DEFAULT 'draft'::character varying,
    location_name character varying(255),
    latitude numeric(10,8),
    longitude numeric(11,8),
    geofence_radius_km numeric(5,2) DEFAULT 5.0,
    geofence_polygon jsonb,
    allow_photo boolean DEFAULT true,
    allow_video boolean DEFAULT true,
    max_file_size_mb integer DEFAULT 10,
    require_location boolean DEFAULT true,
    auto_approve boolean DEFAULT false,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    geofence_level character varying(20) DEFAULT 'radius'::character varying,
    geofence_area_name character varying(255),
    use_multi_zone boolean DEFAULT false,
    CONSTRAINT crowdsource_projects_geofence_level_check CHECK (((geofence_level)::text = ANY ((ARRAY['radius'::character varying, 'kelurahan'::character varying, 'kecamatan'::character varying, 'kabupaten'::character varying, 'provinsi'::character varying])::text[]))),
    CONSTRAINT crowdsource_projects_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'closed'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: COLUMN crowdsource_projects.geofence_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_projects.geofence_level IS 'Level geofence: radius, kelurahan, kecamatan, kabupaten, provinsi';


--
-- Name: COLUMN crowdsource_projects.geofence_area_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_projects.geofence_area_name IS 'Nama wilayah untuk level non-radius';


--
-- Name: COLUMN crowdsource_projects.use_multi_zone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_projects.use_multi_zone IS 'If true, use crowdsource_geofence_zones instead of single location';


--
-- Name: crowdsource_regional_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crowdsource_regional_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    region_name character varying(255) NOT NULL,
    region_level character varying(20),
    region_code character varying(50),
    total_submissions integer DEFAULT 0,
    photo_count integer DEFAULT 0,
    video_count integer DEFAULT 0,
    approved_count integer DEFAULT 0,
    pending_count integer DEFAULT 0,
    center_lat numeric(10,8),
    center_lng numeric(11,8),
    last_updated timestamp with time zone DEFAULT now(),
    CONSTRAINT crowdsource_regional_stats_region_level_check CHECK (((region_level)::text = ANY ((ARRAY['provinsi'::character varying, 'kabupaten'::character varying, 'kecamatan'::character varying, 'kelurahan'::character varying])::text[])))
);


--
-- Name: TABLE crowdsource_regional_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crowdsource_regional_stats IS 'Aggregated statistics per region for dashboard';


--
-- Name: crowdsource_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crowdsource_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: crowdsource_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crowdsource_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    submitter_name character varying(100) NOT NULL,
    submitter_email character varying(255) NOT NULL,
    submitter_whatsapp character varying(20) NOT NULL,
    media_type character varying(10) NOT NULL,
    media_url text NOT NULL,
    thumbnail_url text,
    caption text NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    address text NOT NULL,
    address_detail text,
    status character varying(20) DEFAULT 'pending'::character varying,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    device_info jsonb,
    submitted_at timestamp with time zone DEFAULT now(),
    form_data jsonb,
    location_uncertain boolean DEFAULT false,
    location_level character varying(20) DEFAULT 'exact'::character varying,
    location_verified boolean DEFAULT false,
    moderator_notes text,
    exif_gps_data jsonb,
    consent_publish_name boolean DEFAULT false,
    CONSTRAINT crowdsource_submissions_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['photo'::character varying, 'video'::character varying])::text[]))),
    CONSTRAINT crowdsource_submissions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'flagged'::character varying])::text[]))),
    CONSTRAINT valid_caption_length CHECK ((length(caption) >= 20))
);


--
-- Name: COLUMN crowdsource_submissions.form_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_submissions.form_data IS 'JSON object containing custom field values';


--
-- Name: COLUMN crowdsource_submissions.location_uncertain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_submissions.location_uncertain IS 'True if submitter does not know exact location';


--
-- Name: COLUMN crowdsource_submissions.location_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_submissions.location_level IS 'Level of location certainty: exact, kelurahan, kecamatan, kabupaten, provinsi';


--
-- Name: COLUMN crowdsource_submissions.location_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_submissions.location_verified IS 'True if moderator has verified the location';


--
-- Name: COLUMN crowdsource_submissions.moderator_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_submissions.moderator_notes IS 'Notes from moderator about location verification';


--
-- Name: COLUMN crowdsource_submissions.exif_gps_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_submissions.exif_gps_data IS 'GPS data extracted from photo EXIF metadata';


--
-- Name: COLUMN crowdsource_submissions.consent_publish_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crowdsource_submissions.consent_publish_name IS 'Whether the contributor consents to having their name displayed publicly';


--
-- Name: daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    responder_id uuid,
    log_date date,
    log_content text,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    activity_type character varying(100),
    duration_minutes integer,
    photos jsonb DEFAULT '[]'::jsonb,
    sync_status character varying(20) DEFAULT 'synced'::character varying,
    local_id character varying(100),
    created_device character varying(100),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    status text DEFAULT 'draft'::text,
    resources text
);


--
-- Name: disaster_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disaster_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    location text,
    status text DEFAULT 'active'::text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    urgency text DEFAULT 'MEDIUM'::text,
    affected_count integer DEFAULT 0,
    description text,
    reported_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    disaster_types text[] DEFAULT '{}'::text[],
    latitude double precision,
    longitude double precision,
    start_date timestamp with time zone DEFAULT now()
);


--
-- Name: emergency_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid,
    full_name character varying(255),
    phone_number character varying(50),
    email character varying(255),
    latitude numeric(10,8),
    longitude numeric(11,8),
    address text,
    disaster_type text,
    location text,
    description text,
    assistance_type text,
    photo_url text,
    status text,
    claimed_by uuid,
    claimed_at timestamp(6) with time zone,
    assigned_organization_id uuid,
    status_updated_by uuid,
    status_updated_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    dispatched_to uuid,
    dispatched_at timestamp with time zone,
    dispatch_status character varying(50) DEFAULT 'unassigned'::character varying,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    CONSTRAINT emergency_reports_dispatch_status_check CHECK (((dispatch_status)::text = ANY ((ARRAY['unassigned'::character varying, 'dispatched'::character varying, 'acknowledged'::character varying, 'assigned'::character varying, 'in_progress'::character varying, 'resolved'::character varying])::text[])))
);


--
-- Name: field_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    response_operation_id uuid NOT NULL,
    reported_by uuid NOT NULL,
    category character varying(50) NOT NULL,
    subcategory character varying(100),
    title character varying(255) NOT NULL,
    description text,
    location_name character varying(255),
    latitude numeric(10,8),
    longitude numeric(11,8),
    severity character varying(50),
    urgency character varying(50),
    affected_count integer,
    quantity_delivered character varying(255),
    photos text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT field_reports_category_check CHECK (((category)::text = ANY ((ARRAY['aid_delivery'::character varying, 'field_condition'::character varying, 'incident'::character varying])::text[]))),
    CONSTRAINT field_reports_severity_check CHECK (((severity)::text = ANY ((ARRAY['mild'::character varying, 'moderate'::character varying, 'severe'::character varying])::text[]))),
    CONSTRAINT field_reports_urgency_check CHECK (((urgency)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    reference_type character varying(50),
    reference_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: offline_sync_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offline_sync_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    operation character varying(20) NOT NULL,
    data jsonb NOT NULL,
    sync_status character varying(20) DEFAULT 'pending'::character varying,
    retry_count integer DEFAULT 0,
    last_retry_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    logo_url text,
    contact_email character varying(255),
    contact_phone character varying(50),
    address text,
    description text,
    theme jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    slug text,
    type text,
    email text,
    phone text,
    website text,
    city text,
    province text,
    country text,
    map_location text,
    short_description text,
    primary_contact_name text,
    primary_contact_email text,
    primary_contact_phone text,
    onboarding_complete boolean DEFAULT false,
    settings jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    resource character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    full_name text,
    name character varying(255),
    role character varying(50),
    organization character varying(255),
    role_id uuid,
    assigned_by uuid,
    role_assigned_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    username text,
    phone text,
    status text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    last_location_update timestamp with time zone
);


--
-- Name: report_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    response_operation_id uuid NOT NULL,
    assigned_to uuid NOT NULL,
    assigned_by uuid NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    priority character varying(50) DEFAULT 'normal'::character varying,
    notes text,
    response_notes text,
    assigned_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT report_assignments_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT report_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'declined'::character varying])::text[])))
);


--
-- Name: responder_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.responder_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    responder_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    accuracy_meters numeric(8,2),
    battery_level integer,
    is_charging boolean DEFAULT false,
    location_timestamp timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: response_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    disaster_type character varying(50) NOT NULL,
    description text,
    disaster_location_name character varying(255) NOT NULL,
    disaster_lat numeric(10,8) NOT NULL,
    disaster_lng numeric(11,8) NOT NULL,
    disaster_radius_km numeric(5,2) DEFAULT 10,
    posko_name character varying(255),
    posko_address text,
    posko_lat numeric(10,8),
    posko_lng numeric(11,8),
    status character varying(50) DEFAULT 'active'::character varying,
    created_by uuid,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT response_operations_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: response_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    response_operation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'responder'::character varying,
    status character varying(50) DEFAULT 'invited'::character varying,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now(),
    joined_at timestamp with time zone,
    CONSTRAINT response_team_members_role_check CHECK (((role)::text = ANY ((ARRAY['coordinator'::character varying, 'responder'::character varying])::text[]))),
    CONSTRAINT response_team_members_status_check CHECK (((status)::text = ANY ((ARRAY['invited'::character varying, 'accepted'::character varying, 'declined'::character varying])::text[])))
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    level integer NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sensors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sensors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_id text,
    address text,
    geom public.geometry,
    source text,
    last_updated timestamp(6) with time zone
);


--
-- Name: shared_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    share_id character varying(32) NOT NULL,
    type character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp(6) with time zone,
    created_by uuid,
    is_active boolean DEFAULT true
);


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    responder_id uuid,
    note_text text NOT NULL,
    note_type character varying(50) DEFAULT 'general'::character varying,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    responder_id uuid,
    photo_url character varying(500),
    photo_type character varying(50) DEFAULT 'verification'::character varying,
    description text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    taken_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    emergency_report_id uuid,
    assigned_responder_id uuid,
    organization_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'assigned'::character varying,
    latitude numeric(10,8),
    longitude numeric(11,8),
    address text,
    estimated_duration_minutes integer,
    actual_duration_minutes integer,
    started_at timestamp(6) with time zone,
    completed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_activity_logs (
    id integer NOT NULL,
    organization_id uuid,
    user_id uuid,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_activity_logs_id_seq OWNED BY public.team_activity_logs.id;


--
-- Name: team_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid,
    member_id uuid,
    emergency_report_id uuid,
    disaster_response_id uuid,
    assignment_details text,
    status text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    is_active boolean DEFAULT true
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    organization_id uuid,
    assigned_by uuid,
    assigned_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp(6) with time zone,
    is_active boolean DEFAULT true
);


--
-- Name: water_gates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.water_gates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    description text,
    capacity_info text,
    operational_status character varying(20) DEFAULT 'active'::character varying,
    area character varying(100),
    sub_area character varying(100),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    siaga_1_threshold numeric(5,2),
    siaga_2_threshold numeric(5,2),
    siaga_3_threshold numeric(5,2)
);


--
-- Name: water_gates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.water_gates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: water_gates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.water_gates_id_seq OWNED BY public.water_gates.id;


--
-- Name: water_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.water_levels (
    id integer NOT NULL,
    date date NOT NULL,
    pintu_air character varying(255) NOT NULL,
    time_slot character varying(10) NOT NULL,
    level numeric(5,2),
    siaga character varying(50),
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    scraped_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: water_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.water_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: water_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.water_levels_id_seq OWNED BY public.water_levels.id;


--
-- Name: weather_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weather_data (
    id integer NOT NULL,
    area_id character varying(50),
    provinsi character varying(100),
    kabupaten character varying(100) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    parameter character varying(50),
    datetime timestamp(6) without time zone NOT NULL,
    unit character varying(20),
    value text,
    local_datetime timestamp(6) without time zone,
    suhu_udara character varying(20),
    tutupan_awan character varying(20),
    kode_cuaca integer,
    kondisi_cuaca character varying(100),
    arah_angin_derajat integer,
    arah_angin character varying(10),
    kecepatan_angin character varying(20),
    kelembapan character varying(20),
    jarak_pandang character varying(20),
    time_index character varying(20),
    analysis_date timestamp(6) without time zone,
    image_url text,
    utc_datetime timestamp(6) without time zone,
    scraped_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: weather_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weather_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weather_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weather_data_id_seq OWNED BY public.weather_data.id;


--
-- Name: weather_stations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weather_stations (
    id integer NOT NULL,
    station_code character varying(50),
    kabupaten character varying(100) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    elevation integer,
    station_type character varying(50),
    operational_status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: weather_stations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weather_stations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weather_stations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weather_stations_id_seq OWNED BY public.weather_stations.id;


--
-- Name: team_activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.team_activity_logs_id_seq'::regclass);


--
-- Name: water_gates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_gates ALTER COLUMN id SET DEFAULT nextval('public.water_gates_id_seq'::regclass);


--
-- Name: water_levels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_levels ALTER COLUMN id SET DEFAULT nextval('public.water_levels_id_seq'::regclass);


--
-- Name: weather_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_data ALTER COLUMN id SET DEFAULT nextval('public.weather_data_id_seq'::regclass);


--
-- Name: weather_stations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_stations ALTER COLUMN id SET DEFAULT nextval('public.weather_stations_id_seq'::regclass);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: about_content about_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.about_content
    ADD CONSTRAINT about_content_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: banner_settings banner_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banner_settings
    ADD CONSTRAINT banner_settings_pkey PRIMARY KEY (id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: contents contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contents
    ADD CONSTRAINT contents_pkey PRIMARY KEY (id);


--
-- Name: contributions contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_pkey PRIMARY KEY (id);


--
-- Name: crowdsource_form_fields crowdsource_form_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_form_fields
    ADD CONSTRAINT crowdsource_form_fields_pkey PRIMARY KEY (id);


--
-- Name: crowdsource_geofence_zones crowdsource_geofence_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_geofence_zones
    ADD CONSTRAINT crowdsource_geofence_zones_pkey PRIMARY KEY (id);


--
-- Name: crowdsource_map_layers crowdsource_map_layers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_map_layers
    ADD CONSTRAINT crowdsource_map_layers_pkey PRIMARY KEY (id);


--
-- Name: crowdsource_moderator_invites crowdsource_moderator_invites_invite_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderator_invites
    ADD CONSTRAINT crowdsource_moderator_invites_invite_token_key UNIQUE (invite_token);


--
-- Name: crowdsource_moderator_invites crowdsource_moderator_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderator_invites
    ADD CONSTRAINT crowdsource_moderator_invites_pkey PRIMARY KEY (id);


--
-- Name: crowdsource_moderator_invites crowdsource_moderator_invites_project_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderator_invites
    ADD CONSTRAINT crowdsource_moderator_invites_project_id_email_key UNIQUE (project_id, email);


--
-- Name: crowdsource_moderators crowdsource_moderators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderators
    ADD CONSTRAINT crowdsource_moderators_pkey PRIMARY KEY (id);


--
-- Name: crowdsource_moderators crowdsource_moderators_user_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderators
    ADD CONSTRAINT crowdsource_moderators_user_id_project_id_key UNIQUE (user_id, project_id);


--
-- Name: crowdsource_projects crowdsource_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_projects
    ADD CONSTRAINT crowdsource_projects_pkey PRIMARY KEY (id);


--
-- Name: crowdsource_regional_stats crowdsource_regional_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_regional_stats
    ADD CONSTRAINT crowdsource_regional_stats_pkey PRIMARY KEY (id);


--
-- Name: crowdsource_settings crowdsource_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_settings
    ADD CONSTRAINT crowdsource_settings_key_key UNIQUE (key);


--
-- Name: crowdsource_settings crowdsource_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_settings
    ADD CONSTRAINT crowdsource_settings_pkey PRIMARY KEY (id);


--
-- Name: crowdsource_submissions crowdsource_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_submissions
    ADD CONSTRAINT crowdsource_submissions_pkey PRIMARY KEY (id);


--
-- Name: daily_logs daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);


--
-- Name: disaster_responses disaster_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_responses
    ADD CONSTRAINT disaster_responses_pkey PRIMARY KEY (id);


--
-- Name: emergency_reports emergency_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_reports
    ADD CONSTRAINT emergency_reports_pkey PRIMARY KEY (id);


--
-- Name: field_reports field_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_reports
    ADD CONSTRAINT field_reports_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offline_sync_queue offline_sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offline_sync_queue
    ADD CONSTRAINT offline_sync_queue_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);


--
-- Name: report_assignments report_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_assignments
    ADD CONSTRAINT report_assignments_pkey PRIMARY KEY (id);


--
-- Name: report_assignments report_assignments_report_id_assigned_to_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_assignments
    ADD CONSTRAINT report_assignments_report_id_assigned_to_key UNIQUE (report_id, assigned_to);


--
-- Name: responder_locations responder_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responder_locations
    ADD CONSTRAINT responder_locations_pkey PRIMARY KEY (id);


--
-- Name: response_operations response_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_operations
    ADD CONSTRAINT response_operations_pkey PRIMARY KEY (id);


--
-- Name: response_team_members response_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_team_members
    ADD CONSTRAINT response_team_members_pkey PRIMARY KEY (id);


--
-- Name: response_team_members response_team_members_response_operation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_team_members
    ADD CONSTRAINT response_team_members_response_operation_id_user_id_key UNIQUE (response_operation_id, user_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sensors sensors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensors
    ADD CONSTRAINT sensors_pkey PRIMARY KEY (id);


--
-- Name: shared_reports shared_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_reports
    ADD CONSTRAINT shared_reports_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: task_notes task_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_notes
    ADD CONSTRAINT task_notes_pkey PRIMARY KEY (id);


--
-- Name: task_photos task_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_photos
    ADD CONSTRAINT task_photos_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: team_activity_logs team_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_activity_logs
    ADD CONSTRAINT team_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: team_assignments team_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_assignments
    ADD CONSTRAINT team_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_policies user_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_policies
    ADD CONSTRAINT user_policies_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: water_gates water_gates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_gates
    ADD CONSTRAINT water_gates_pkey PRIMARY KEY (id);


--
-- Name: water_levels water_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_levels
    ADD CONSTRAINT water_levels_pkey PRIMARY KEY (id);


--
-- Name: weather_data weather_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_data
    ADD CONSTRAINT weather_data_pkey PRIMARY KEY (id);


--
-- Name: weather_stations weather_stations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_stations
    ADD CONSTRAINT weather_stations_pkey PRIMARY KEY (id);


--
-- Name: admin_users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admin_users_email_key ON public.admin_users USING btree (email);


--
-- Name: idx_admin_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_users_email ON public.admin_users USING btree (email);


--
-- Name: idx_assignments_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_assignee ON public.report_assignments USING btree (assigned_to, status);


--
-- Name: idx_assignments_disaster_response_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_disaster_response_id ON public.assignments USING btree (disaster_response_id);


--
-- Name: idx_assignments_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_operation ON public.report_assignments USING btree (response_operation_id);


--
-- Name: idx_assignments_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_organization_id ON public.assignments USING btree (organization_id);


--
-- Name: idx_assignments_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_report ON public.report_assignments USING btree (report_id);


--
-- Name: idx_assignments_responder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_responder_id ON public.assignments USING btree (responder_id);


--
-- Name: idx_assignments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_status ON public.assignments USING btree (status);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_organization_id ON public.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_contributions_dispatch_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_dispatch_status ON public.contributions USING btree (dispatch_status);


--
-- Name: idx_contributions_dispatched_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_dispatched_to ON public.contributions USING btree (dispatched_to);


--
-- Name: idx_contributions_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_location ON public.contributions USING btree (latitude, longitude);


--
-- Name: idx_crowdsource_form_fields_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_form_fields_order ON public.crowdsource_form_fields USING btree (project_id, display_order);


--
-- Name: idx_crowdsource_form_fields_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_form_fields_project ON public.crowdsource_form_fields USING btree (project_id);


--
-- Name: idx_crowdsource_geofence_zones_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_geofence_zones_project ON public.crowdsource_geofence_zones USING btree (project_id);


--
-- Name: idx_crowdsource_invites_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_invites_token ON public.crowdsource_moderator_invites USING btree (invite_token);


--
-- Name: idx_crowdsource_moderators_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_moderators_project ON public.crowdsource_moderators USING btree (project_id);


--
-- Name: idx_crowdsource_moderators_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_moderators_user ON public.crowdsource_moderators USING btree (user_id);


--
-- Name: idx_crowdsource_projects_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_projects_location ON public.crowdsource_projects USING btree (latitude, longitude);


--
-- Name: idx_crowdsource_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_projects_status ON public.crowdsource_projects USING btree (status);


--
-- Name: idx_crowdsource_submissions_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_submissions_location ON public.crowdsource_submissions USING btree (latitude, longitude);


--
-- Name: idx_crowdsource_submissions_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_submissions_project ON public.crowdsource_submissions USING btree (project_id);


--
-- Name: idx_crowdsource_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crowdsource_submissions_status ON public.crowdsource_submissions USING btree (status);


--
-- Name: idx_daily_logs_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_location ON public.daily_logs USING btree (location_lat, location_lng);


--
-- Name: idx_daily_logs_responder_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_responder_date ON public.daily_logs USING btree (responder_id, log_date);


--
-- Name: idx_daily_logs_sync_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_sync_status ON public.daily_logs USING btree (sync_status);


--
-- Name: idx_disaster_responses_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disaster_responses_org ON public.disaster_responses USING btree (organization_id);


--
-- Name: idx_emergency_reports_assigned_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_reports_assigned_org ON public.emergency_reports USING btree (assigned_organization_id);


--
-- Name: idx_emergency_reports_claimed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_reports_claimed_by ON public.emergency_reports USING btree (claimed_by);


--
-- Name: idx_emergency_reports_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_reports_location ON public.emergency_reports USING btree (latitude, longitude);


--
-- Name: idx_emergency_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_reports_status ON public.emergency_reports USING btree (status);


--
-- Name: idx_field_reports_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_field_reports_category ON public.field_reports USING btree (category);


--
-- Name: idx_field_reports_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_field_reports_operation ON public.field_reports USING btree (response_operation_id);


--
-- Name: idx_field_reports_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_field_reports_reporter ON public.field_reports USING btree (reported_by);


--
-- Name: idx_map_layers_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_map_layers_project ON public.crowdsource_map_layers USING btree (project_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, read_at);


--
-- Name: idx_offline_sync_queue_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offline_sync_queue_entity ON public.offline_sync_queue USING btree (entity_type, entity_id);


--
-- Name: idx_offline_sync_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offline_sync_queue_status ON public.offline_sync_queue USING btree (sync_status);


--
-- Name: idx_offline_sync_queue_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offline_sync_queue_user ON public.offline_sync_queue USING btree (user_id);


--
-- Name: idx_organizations_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_name ON public.organizations USING btree (name);


--
-- Name: idx_organizations_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug);


--
-- Name: idx_profiles_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_organization_id ON public.profiles USING btree (organization_id);


--
-- Name: idx_profiles_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_organization_status ON public.profiles USING btree (organization_id, status);


--
-- Name: idx_profiles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role_id ON public.profiles USING btree (role_id);


--
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


--
-- Name: idx_profiles_user_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user_org ON public.profiles USING btree (user_id, organization_id);


--
-- Name: idx_regional_stats_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regional_stats_project ON public.crowdsource_regional_stats USING btree (project_id);


--
-- Name: idx_reports_dispatch_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_dispatch_status ON public.emergency_reports USING btree (dispatch_status);


--
-- Name: idx_reports_dispatched_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_dispatched_to ON public.emergency_reports USING btree (dispatched_to);


--
-- Name: idx_reports_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_location ON public.emergency_reports USING btree (latitude, longitude);


--
-- Name: idx_responder_locations_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responder_locations_org ON public.responder_locations USING btree (organization_id);


--
-- Name: idx_responder_locations_responder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responder_locations_responder ON public.responder_locations USING btree (responder_id);


--
-- Name: idx_responder_locations_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responder_locations_timestamp ON public.responder_locations USING btree (location_timestamp);


--
-- Name: idx_response_ops_disaster; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_ops_disaster ON public.response_operations USING btree (disaster_type);


--
-- Name: idx_response_ops_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_ops_location ON public.response_operations USING btree (disaster_lat, disaster_lng);


--
-- Name: idx_response_ops_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_ops_org ON public.response_operations USING btree (organization_id);


--
-- Name: idx_response_ops_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_ops_status ON public.response_operations USING btree (status);


--
-- Name: idx_submissions_location_uncertain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_location_uncertain ON public.crowdsource_submissions USING btree (location_uncertain);


--
-- Name: idx_submissions_location_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_location_verified ON public.crowdsource_submissions USING btree (location_verified);


--
-- Name: idx_task_notes_responder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_notes_responder ON public.task_notes USING btree (responder_id);


--
-- Name: idx_task_notes_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_notes_task ON public.task_notes USING btree (task_id);


--
-- Name: idx_task_photos_responder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_photos_responder ON public.task_photos USING btree (responder_id);


--
-- Name: idx_task_photos_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_photos_task ON public.task_photos USING btree (task_id);


--
-- Name: idx_task_photos_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_photos_type ON public.task_photos USING btree (photo_type);


--
-- Name: idx_tasks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at);


--
-- Name: idx_tasks_emergency_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_emergency_report ON public.tasks USING btree (emergency_report_id);


--
-- Name: idx_tasks_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_location ON public.tasks USING btree (latitude, longitude);


--
-- Name: idx_tasks_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_organization ON public.tasks USING btree (organization_id);


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority);


--
-- Name: idx_tasks_responder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_responder ON public.tasks USING btree (assigned_responder_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_team_activity_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_activity_org ON public.team_activity_logs USING btree (organization_id);


--
-- Name: idx_team_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_activity_user ON public.team_activity_logs USING btree (user_id);


--
-- Name: idx_team_assignments_disaster_response_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_assignments_disaster_response_id ON public.team_assignments USING btree (disaster_response_id);


--
-- Name: idx_team_assignments_member_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_assignments_member_id ON public.team_assignments USING btree (member_id);


--
-- Name: idx_team_members_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_operation ON public.response_team_members USING btree (response_operation_id);


--
-- Name: idx_team_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user ON public.response_team_members USING btree (user_id, status);


--
-- Name: idx_water_gates_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_water_gates_location ON public.water_gates USING btree (latitude, longitude);


--
-- Name: idx_water_levels_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_water_levels_date ON public.water_levels USING btree (date);


--
-- Name: idx_water_levels_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_water_levels_location ON public.water_levels USING btree (location_lat, location_lng);


--
-- Name: idx_water_levels_pintu_air; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_water_levels_pintu_air ON public.water_levels USING btree (pintu_air);


--
-- Name: idx_weather_data_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weather_data_datetime ON public.weather_data USING btree (datetime);


--
-- Name: idx_weather_data_kabupaten; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weather_data_kabupaten ON public.weather_data USING btree (kabupaten);


--
-- Name: idx_weather_data_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weather_data_location ON public.weather_data USING btree (latitude, longitude);


--
-- Name: idx_weather_data_parameter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weather_data_parameter ON public.weather_data USING btree (parameter);


--
-- Name: idx_weather_stations_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weather_stations_location ON public.weather_stations USING btree (latitude, longitude);


--
-- Name: organizations_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);


--
-- Name: permissions_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissions_name_key ON public.permissions USING btree (name);


--
-- Name: role_permissions_role_id_permission_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON public.role_permissions USING btree (role_id, permission_id);


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: shared_reports_share_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shared_reports_share_id_key ON public.shared_reports USING btree (share_id);


--
-- Name: unique_water_level_reading; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_water_level_reading ON public.water_levels USING btree (date, pintu_air, time_slot);


--
-- Name: user_roles_user_id_organization_id_role_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_roles_user_id_organization_id_role_id_key ON public.user_roles USING btree (user_id, organization_id, role_id);


--
-- Name: water_gates_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX water_gates_name_key ON public.water_gates USING btree (name);


--
-- Name: weather_data_unique_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX weather_data_unique_datetime ON public.weather_data USING btree (kabupaten, datetime);


--
-- Name: weather_stations_station_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX weather_stations_station_code_key ON public.weather_stations USING btree (station_code);


--
-- Name: crowdsource_projects trigger_crowdsource_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_crowdsource_projects_updated_at BEFORE UPDATE ON public.crowdsource_projects FOR EACH ROW EXECUTE FUNCTION public.update_crowdsource_updated_at();


--
-- Name: crowdsource_settings trigger_crowdsource_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_crowdsource_settings_updated_at BEFORE UPDATE ON public.crowdsource_settings FOR EACH ROW EXECUTE FUNCTION public.update_crowdsource_updated_at();


--
-- Name: assignments update_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: field_reports update_field_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_field_reports_updated_at BEFORE UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: response_operations update_response_operations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_response_operations_updated_at BEFORE UPDATE ON public.response_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_contribution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES public.contributions(id) ON DELETE SET NULL;


--
-- Name: assignments assignments_disaster_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_disaster_response_id_fkey FOREIGN KEY (disaster_response_id) REFERENCES public.disaster_responses(id) ON DELETE SET NULL;


--
-- Name: assignments assignments_emergency_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_emergency_report_id_fkey FOREIGN KEY (emergency_report_id) REFERENCES public.emergency_reports(id) ON DELETE SET NULL;


--
-- Name: assignments assignments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_responder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_responder_id_fkey FOREIGN KEY (responder_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: contributions contributions_dispatched_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_dispatched_to_fkey FOREIGN KEY (dispatched_to) REFERENCES public.organizations(id);


--
-- Name: crowdsource_form_fields crowdsource_form_fields_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_form_fields
    ADD CONSTRAINT crowdsource_form_fields_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.crowdsource_projects(id) ON DELETE CASCADE;


--
-- Name: crowdsource_geofence_zones crowdsource_geofence_zones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_geofence_zones
    ADD CONSTRAINT crowdsource_geofence_zones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.crowdsource_projects(id) ON DELETE CASCADE;


--
-- Name: crowdsource_map_layers crowdsource_map_layers_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_map_layers
    ADD CONSTRAINT crowdsource_map_layers_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.crowdsource_projects(id) ON DELETE CASCADE;


--
-- Name: crowdsource_moderator_invites crowdsource_moderator_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderator_invites
    ADD CONSTRAINT crowdsource_moderator_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: crowdsource_moderator_invites crowdsource_moderator_invites_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderator_invites
    ADD CONSTRAINT crowdsource_moderator_invites_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.crowdsource_projects(id) ON DELETE CASCADE;


--
-- Name: crowdsource_moderators crowdsource_moderators_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderators
    ADD CONSTRAINT crowdsource_moderators_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: crowdsource_moderators crowdsource_moderators_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderators
    ADD CONSTRAINT crowdsource_moderators_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.crowdsource_projects(id) ON DELETE CASCADE;


--
-- Name: crowdsource_moderators crowdsource_moderators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_moderators
    ADD CONSTRAINT crowdsource_moderators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: crowdsource_projects crowdsource_projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_projects
    ADD CONSTRAINT crowdsource_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: crowdsource_regional_stats crowdsource_regional_stats_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_regional_stats
    ADD CONSTRAINT crowdsource_regional_stats_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.crowdsource_projects(id) ON DELETE CASCADE;


--
-- Name: crowdsource_settings crowdsource_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_settings
    ADD CONSTRAINT crowdsource_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: crowdsource_submissions crowdsource_submissions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_submissions
    ADD CONSTRAINT crowdsource_submissions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.crowdsource_projects(id) ON DELETE CASCADE;


--
-- Name: crowdsource_submissions crowdsource_submissions_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crowdsource_submissions
    ADD CONSTRAINT crowdsource_submissions_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);


--
-- Name: disaster_responses disaster_responses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_responses
    ADD CONSTRAINT disaster_responses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: emergency_reports emergency_reports_assigned_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_reports
    ADD CONSTRAINT emergency_reports_assigned_organization_id_fkey FOREIGN KEY (assigned_organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: emergency_reports emergency_reports_dispatched_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_reports
    ADD CONSTRAINT emergency_reports_dispatched_to_fkey FOREIGN KEY (dispatched_to) REFERENCES public.organizations(id);


--
-- Name: field_reports field_reports_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_reports
    ADD CONSTRAINT field_reports_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES auth.users(id);


--
-- Name: field_reports field_reports_response_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_reports
    ADD CONSTRAINT field_reports_response_operation_id_fkey FOREIGN KEY (response_operation_id) REFERENCES public.response_operations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: report_assignments report_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_assignments
    ADD CONSTRAINT report_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: report_assignments report_assignments_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_assignments
    ADD CONSTRAINT report_assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: report_assignments report_assignments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_assignments
    ADD CONSTRAINT report_assignments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.emergency_reports(id) ON DELETE CASCADE;


--
-- Name: report_assignments report_assignments_response_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_assignments
    ADD CONSTRAINT report_assignments_response_operation_id_fkey FOREIGN KEY (response_operation_id) REFERENCES public.response_operations(id) ON DELETE CASCADE;


--
-- Name: response_operations response_operations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_operations
    ADD CONSTRAINT response_operations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: response_operations response_operations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_operations
    ADD CONSTRAINT response_operations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: response_team_members response_team_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_team_members
    ADD CONSTRAINT response_team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: response_team_members response_team_members_response_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_team_members
    ADD CONSTRAINT response_team_members_response_operation_id_fkey FOREIGN KEY (response_operation_id) REFERENCES public.response_operations(id) ON DELETE CASCADE;


--
-- Name: response_team_members response_team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_team_members
    ADD CONSTRAINT response_team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shifts shifts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: task_notes task_notes_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_notes
    ADD CONSTRAINT task_notes_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_photos task_photos_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_photos
    ADD CONSTRAINT task_photos_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: team_activity_logs team_activity_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_activity_logs
    ADD CONSTRAINT team_activity_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: team_activity_logs team_activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_activity_logs
    ADD CONSTRAINT team_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict JHQen03TokRQaVcliYHN3LaAQmLFz7nJCZCXKEK0LI1vJ16Wc2ilzy2Ur5LAhDC

