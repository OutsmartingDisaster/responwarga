-- API Keys for partner/organization data access
-- Migration: 20251205_001_api_keys.sql

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(12) NOT NULL, -- First 8 chars for identification
    scopes TEXT[] DEFAULT ARRAY['read_org_data'],
    rate_limit_per_hour INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization ON api_keys(organization_id);

-- API key usage log for audit
CREATE TABLE IF NOT EXISTS api_key_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_log_key ON api_key_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_log_created ON api_key_usage_log(created_at);

-- Export history for audit
CREATE TABLE IF NOT EXISTS export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    export_type VARCHAR(50) NOT NULL, -- 'incidents', 'crowdsource', 'contributions'
    format VARCHAR(20) NOT NULL, -- 'csv', 'json', 'geojson'
    filters JSONB, -- Store applied filters
    record_count INTEGER,
    file_size_bytes INTEGER,
    anonymized BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_history_user ON export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_export_history_org ON export_history(organization_id);

-- Anonymization rules configuration
CREATE TABLE IF NOT EXISTS anonymization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'redact', 'hash', 'truncate', 'generalize'
    rule_config JSONB, -- Additional config for the rule
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(field_name, table_name)
);

-- Insert default anonymization rules
INSERT INTO anonymization_rules (field_name, table_name, rule_type, rule_config) VALUES
    ('phone', 'emergency_reports', 'redact', '{"replacement": "***"}'),
    ('full_name', 'emergency_reports', 'truncate', '{"keep_first": 1}'),
    ('submitter_email', 'crowdsource_submissions', 'redact', '{"replacement": "***@***.***"}'),
    ('submitter_whatsapp', 'crowdsource_submissions', 'redact', '{"replacement": "***"}'),
    ('submitter_name', 'crowdsource_submissions', 'truncate', '{"keep_first": 1}')
ON CONFLICT (field_name, table_name) DO NOTHING;

COMMENT ON TABLE api_keys IS 'API keys for partner/organization data access';
COMMENT ON TABLE api_key_usage_log IS 'Audit log for API key usage';
COMMENT ON TABLE export_history IS 'History of data exports for audit';
COMMENT ON TABLE anonymization_rules IS 'Rules for anonymizing sensitive data in exports';
