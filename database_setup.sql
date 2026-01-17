-- ZEZE Guitar Learning Database Schema
-- Execute this SQL in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Users Table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    hashed_password VARCHAR(255),
    auth_provider VARCHAR(20) DEFAULT 'email',
    provider_id VARCHAR(255),
    skill_level INTEGER DEFAULT 1,
    preferred_genres VARCHAR(100)[] DEFAULT '{}',
    practice_goal VARCHAR(50),
    daily_reminder_time TIME,
    notify_on_completion BOOLEAN DEFAULT true,
    current_device_id VARCHAR(255),
    last_ip_address INET,
    timezone VARCHAR(50) DEFAULT 'UTC',
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    total_practice_time INTEGER DEFAULT 0,
    songs_learned INTEGER DEFAULT 0,
    consecutive_days INTEGER DEFAULT 0,
    last_streak_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT skill_level_range CHECK (skill_level BETWEEN 1 AND 10)
);

-- Songs Table
CREATE TABLE songs (
    song_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id VARCHAR(20) UNIQUE,
    spotify_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    release_year INTEGER,
    duration_seconds INTEGER NOT NULL,
    original_key VARCHAR(5),
    tempo_bpm DECIMAL(5,2),
    time_signature VARCHAR(10),
    energy_level DECIMAL(3,2),
    valence DECIMAL(3,2),
    chord_progression JSONB,
    note_sequence JSONB,
    beat_grid JSONB,
    sections JSONB,
    techniques_identified JSONB,
    overall_difficulty DECIMAL(3,2),
    chord_difficulty DECIMAL(3,2),
    solo_difficulty DECIMAL(3,2),
    rhythm_difficulty DECIMAL(3,2),
    speed_difficulty DECIMAL(3,2),
    original_audio_url VARCHAR(500),
    processed_audio_url VARCHAR(500),
    waveform_data JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_progress INTEGER DEFAULT 0,
    processing_errors TEXT[],
    thumbnail_url VARCHAR(500),
    popularity_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    CONSTRAINT difficulty_range CHECK (overall_difficulty BETWEEN 0.0 AND 10.0)
);

-- Practice Sessions Table
CREATE TABLE practice_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(song_id) ON DELETE SET NULL,
    user_song_id UUID REFERENCES user_songs(user_song_id) ON DELETE CASCADE,
    session_type VARCHAR(20) DEFAULT 'song_practice',
    focus_techniques VARCHAR(50)[],
    tempo_percentage INTEGER DEFAULT 100,
    transposition_key VARCHAR(5),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    overall_accuracy DECIMAL(5,2),
    timing_accuracy DECIMAL(5,2),
    pitch_accuracy DECIMAL(5,2),
    rhythm_accuracy DECIMAL(5,2),
    chord_accuracy JSONB,
    section_accuracy JSONB,
    mistakes JSONB,
    improvement_areas JSONB,
    notes_played INTEGER,
    chords_played INTEGER,
    techniques_used JSONB,
    max_speed_bpm DECIMAL(5,2),
    avg_speed_bpm DECIMAL(5,2),
    user_rating INTEGER,
    user_feedback TEXT,
    session_notes TEXT,
    device_type VARCHAR(50),
    app_version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT accuracy_check CHECK (overall_accuracy BETWEEN 0.0 AND 100.0),
    CONSTRAINT rating_check CHECK (user_rating BETWEEN 1 AND 5)
);

-- Techniques Table
CREATE TABLE techniques (
    technique_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    difficulty_level INTEGER NOT NULL,
    prerequisite_techniques UUID[],
    related_techniques UUID[],
    description TEXT NOT NULL,
    instructions JSONB,
    common_mistakes TEXT[],
    tips TEXT[],
    finger_positions JSONB,
    picking_patterns JSONB,
    fretboard_positions JSONB,
    notation_example TEXT,
    video_url VARCHAR(500),
    audio_example_url VARCHAR(500),
    diagram_url VARCHAR(500),
    popularity_score DECIMAL(5,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT difficulty_range CHECK (difficulty_level BETWEEN 1 AND 10)
);

-- Chords Table
CREATE TABLE chords (
    chord_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    notation VARCHAR(10) NOT NULL,
    root_note VARCHAR(5) NOT NULL,
    chord_type VARCHAR(20) NOT NULL,
    intervals INTEGER[],
    basic_fingering JSONB,
    alternative_fingerings JSONB[],
    barre_positions INTEGER[],
    capo_positions JSONB,
    difficulty_level INTEGER,
    common_progressions JSONB,
    scale_relationship VARCHAR(100)[],
    notes VARCHAR(50)[],
    roman_numeral VARCHAR(10),
    popularity_score DECIMAL(5,2) DEFAULT 0.0,
    usage_frequency INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notation, root_note, chord_type)
);

-- User Songs Table (for saved/imported songs)
CREATE TABLE user_songs (
    user_song_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(song_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    original_file_name VARCHAR(255),
    uploaded_file_path VARCHAR(500),
    metadata JSONB,
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Song Techniques Relationship
CREATE TABLE song_techniques (
    song_technique_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(song_id) ON DELETE CASCADE,
    technique_id UUID NOT NULL REFERENCES techniques(technique_id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2),
    timestamp_start DECIMAL(6,2),
    timestamp_end DECIMAL(6,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, technique_id, timestamp_start)
);

-- User Progress Table
CREATE TABLE user_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    technique_id UUID NOT NULL REFERENCES techniques(technique_id) ON DELETE CASCADE,
    skill_level INTEGER DEFAULT 1,
    practice_count INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    mastery_score DECIMAL(5,2) DEFAULT 0.0,
    mastered_techniques UUID[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, technique_id)
);

-- System Logs Table (for TimescaleDB)
CREATE TABLE system_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    service VARCHAR(50),
    user_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Convert practice_sessions and system_logs to hypertables
SELECT create_hypertable('practice_sessions', 'start_time', chunk_time_interval => INTERVAL '1 week');
SELECT create_hypertable('system_logs', 'created_at', chunk_time_interval => INTERVAL '1 day');

-- Create indexes for performance
CREATE INDEX idx_songs_youtube_id ON songs(youtube_id);
CREATE INDEX idx_songs_processing_status ON songs(processing_status);
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_sessions_start_time ON practice_sessions(start_time DESC);
CREATE INDEX idx_user_songs_user_id ON user_songs(user_id);
CREATE INDEX idx_song_techniques_song_id ON song_techniques(song_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);

-- Insert some sample techniques data
INSERT INTO techniques (name, slug, category, difficulty_level, description, instructions, common_mistakes, tips) VALUES
('Open Chords', 'open-chords', 'chords', 1, 'Master common open-position chords and smooth transitions.', '["Place fingers on frets as shown", "Strum from low to high strings", "Practice transitions slowly"]'::jsonb, '["Not pressing strings firmly enough", "Moving fingers too high off fretboard"]'::text[], '["Start with basic C, G, D, Em, Am chords", "Use a metronome for timing", "Practice transitions at slow tempo first"]'::text[]),
('Hammer-ons', 'hammer-ons', 'technique', 2, 'Build speed and accuracy with legato techniques.', '["Place finger on fret", "Pick the note", "Quickly hammer second finger down", "Release pressure to let note ring"]'::jsonb, '["Not hammering firmly enough", "Timing the hammer incorrectly"]'::text[], '["Practice slowly at first", "Use a metronome", "Focus on clean sound"]'::text[]),
('Strumming Patterns', 'strumming-patterns', 'rhythm', 1, 'Practice common strumming patterns and tempo control.', '["Hold pick correctly", "Practice downstrokes first", "Add upstrokes gradually", "Maintain consistent tempo"]'::jsonb, '["Inconsistent timing", "Too much arm movement"]'::text[], '["Start with simple down-up pattern", "Use a metronome", "Practice with songs you know"]'::text[]);

-- Insert sample chords
INSERT INTO chords (name, notation, root_note, chord_type, difficulty_level) VALUES
('C Major', 'C', 'C', 'major', 1),
('G Major', 'G', 'G', 'major', 2),
('D Major', 'D', 'D', 'major', 2),
('E Minor', 'Em', 'E', 'minor', 1),
('A Minor', 'Am', 'A', 'minor', 1);

-- Create RLS policies for Supabase (if needed)
-- These would be set up in Supabase dashboard or via migration

-- Grant necessary permissions (adjust based on your needs)
GRANT ALL ON users TO authenticated;
GRANT ALL ON songs TO authenticated;
GRANT ALL ON practice_sessions TO authenticated;
GRANT ALL ON techniques TO authenticated;
GRANT ALL ON chords TO authenticated;
GRANT ALL ON user_songs TO authenticated;
GRANT ALL ON song_techniques TO authenticated;
GRANT ALL ON user_progress TO authenticated;