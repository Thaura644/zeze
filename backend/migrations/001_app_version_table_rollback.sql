-- Rollback for app version tables migration
-- This rollback removes the tables created in 001_app_version_table.sql

-- Drop indexes first
DROP INDEX IF EXISTS idx_app_version_checks_platform;
DROP INDEX IF EXISTS idx_app_version_checks_created_at;

-- Drop tables
DROP TABLE IF EXISTS app_version_checks;
DROP TABLE IF EXISTS app_versions;