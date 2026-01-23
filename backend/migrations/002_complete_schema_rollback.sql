-- Rollback for complete schema migration
-- This rollback removes all tables and functions created in 002_complete_schema.sql

-- Drop triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_songs_updated_at ON songs;
DROP TRIGGER IF EXISTS update_practice_sessions_updated_at ON practice_sessions;
DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
DROP TRIGGER IF EXISTS update_app_versions_updated_at ON app_versions;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_songs_artist;
DROP INDEX IF EXISTS idx_songs_title;
DROP INDEX IF EXISTS idx_songs_difficulty;
DROP INDEX IF EXISTS idx_song_chords_song_id;
DROP INDEX IF EXISTS idx_song_tablature_song_id;
DROP INDEX IF EXISTS idx_practice_sessions_user_id;
DROP INDEX IF EXISTS idx_practice_sessions_song_id;
DROP INDEX IF EXISTS idx_practice_sessions_start_time;
DROP INDEX IF EXISTS idx_user_saved_songs_user_id;
DROP INDEX IF EXISTS idx_user_saved_songs_song_id;
DROP INDEX IF EXISTS idx_songs_youtube_id;
DROP INDEX IF EXISTS idx_songs_song_id;
DROP INDEX IF EXISTS idx_processing_jobs_status;
DROP INDEX IF EXISTS idx_processing_jobs_job_id;
DROP INDEX IF EXISTS idx_exercises_type;
DROP INDEX IF EXISTS idx_exercises_difficulty;
DROP INDEX IF EXISTS idx_user_progress_user_id;
DROP INDEX IF EXISTS idx_user_progress_exercise_id;
DROP INDEX IF EXISTS idx_app_version_checks_platform;
DROP INDEX IF EXISTS idx_app_version_checks_created_at;

-- Drop tables in reverse order of creation to handle dependencies
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS audio_files CASCADE;
DROP TABLE IF EXISTS processing_jobs CASCADE;
DROP TABLE IF EXISTS user_saved_songs CASCADE;
DROP TABLE IF EXISTS practice_sessions CASCADE;
DROP TABLE IF EXISTS song_techniques CASCADE;
DROP TABLE IF EXISTS techniques CASCADE;
DROP TABLE IF EXISTS song_tablature CASCADE;
DROP TABLE IF EXISTS song_chords CASCADE;
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS app_version_checks CASCADE;
DROP TABLE IF EXISTS app_versions CASCADE;