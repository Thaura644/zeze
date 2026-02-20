-- Migration: Create app_versions table
CREATE TABLE IF NOT EXISTS app_versions (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    current_version VARCHAR(20) NOT NULL,
    min_version VARCHAR(20) NOT NULL,
    force_update BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_versions (platform, current_version, min_version) VALUES
('ios', '1.0.0', '1.0.0'),
('android', '1.0.0', '1.0.0')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS app_version_checks (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    current_version VARCHAR(20) NOT NULL,
    latest_version VARCHAR(20) NOT NULL,
    needs_update BOOLEAN NOT NULL,
    ip VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
