# Backend Version Database Migration

-- Create table for app version checks and analytics
CREATE TABLE IF NOT EXISTS app_version_checks (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  current_version VARCHAR(20) NOT NULL,
  latest_version VARCHAR(20) NOT NULL,
  needs_update BOOLEAN NOT NULL DEFAULT FALSE,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_app_version_checks_platform ON app_version_checks(platform);
CREATE INDEX IF NOT EXISTS idx_app_version_checks_created_at ON app_version_checks(created_at);

-- Create table for version configuration (optional - for dynamic version management)
CREATE TABLE IF NOT EXISTS app_versions (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) UNIQUE NOT NULL,
  current_version VARCHAR(20) NOT NULL,
  min_supported_version VARCHAR(20) NOT NULL,
  codepush_deployment_key TEXT,
  force_update BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default version configurations
INSERT INTO app_versions (platform, current_version, min_supported_version, force_update) VALUES
('ios', '1.0.0', '1.0.0', FALSE),
('android', '1.0.0', '1.0.0', FALSE)
ON CONFLICT (platform) DO NOTHING;