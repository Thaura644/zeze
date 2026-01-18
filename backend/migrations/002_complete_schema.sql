-- Complete database schema for ZEZE backend
-- Run this to create all required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    skill_level INTEGER DEFAULT 1,
    preferred_genres TEXT[] DEFAULT '{}',
    practice_goal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    youtube_id VARCHAR(50) UNIQUE,
    spotify_id VARCHAR(100) UNIQUE,
    song_id VARCHAR(100) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    release_year INTEGER,
    duration_seconds INTEGER NOT NULL,
    original_key VARCHAR(10) NOT NULL,
    tempo_bpm INTEGER NOT NULL,
    time_signature VARCHAR(20) DEFAULT '4/4',
    energy_level DECIMAL(3,2),
    valence DECIMAL(3,2),
    chord_progression JSONB,
    note_sequence JSONB,
    beat_grid JSONB,
    sections JSONB,
    techniques_identified TEXT[],
    overall_difficulty DECIMAL(3,2) DEFAULT 5.0,
    chord_difficulty DECIMAL(3,2),
    solo_difficulty DECIMAL(3,2),
    rhythm_difficulty DECIMAL(3,2),
    speed_difficulty DECIMAL(3,2),
    original_audio_url TEXT,
    processed_audio_url TEXT,
    waveform_data JSONB,
    thumbnail_url TEXT,
    processing_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Song chords data
CREATE TABLE IF NOT EXISTS song_chords (
    id SERIAL PRIMARY KEY,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    chord VARCHAR(50) NOT NULL,
    start_time DECIMAL(10,4) NOT NULL,
    duration DECIMAL(10,4) NOT NULL,
    confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Song tablature
CREATE TABLE IF NOT EXISTS song_tablature (
    id SERIAL PRIMARY KEY,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    string_num INTEGER NOT NULL,
    fret_num INTEGER NOT NULL,
    time_position DECIMAL(10,4) NOT NULL,
    duration DECIMAL(10,4) NOT NULL,
    chord VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Techniques table
CREATE TABLE IF NOT EXISTS techniques (
    id SERIAL PRIMARY KEY,
    technique VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Song techniques
CREATE TABLE IF NOT EXISTS song_techniques (
    id SERIAL PRIMARY KEY,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    technique_id INTEGER REFERENCES techniques(id) ON DELETE CASCADE,
    start_time DECIMAL(10,4) NOT NULL,
    end_time DECIMAL(10,4) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Practice sessions
CREATE TABLE IF NOT EXISTS practice_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL DEFAULT 'practice',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    focus_techniques TEXT[] DEFAULT '{}',
    tempo_percentage DECIMAL(3,2) DEFAULT 100.0,
    transposition_key VARCHAR(10),
    overall_accuracy DECIMAL(3,2),
    timing_accuracy DECIMAL(3,2),
    pitch_accuracy DECIMAL(3,2),
    rhythm_accuracy DECIMAL(3,2),
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    session_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User saved songs
CREATE TABLE IF NOT EXISTS user_saved_songs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id VARCHAR(100) REFERENCES songs(song_id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, song_id)
);

-- Processing jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress_percentage INTEGER DEFAULT 0,
    current_step VARCHAR(255),
    estimated_remaining_seconds INTEGER,
    source_type VARCHAR(50) NOT NULL,
    source_url TEXT,
    source_file_path TEXT,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio files
CREATE TABLE IF NOT EXISTS audio_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path TEXT NOT NULL,
    file_size INTEGER,
    duration_seconds INTEGER,
    format VARCHAR(50),
    sample_rate INTEGER,
    bit_rate INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exercise_type VARCHAR(50) NOT NULL,
    difficulty_level DECIMAL(3,2) DEFAULT 3.0,
    target_techniques TEXT[] DEFAULT '{}',
    tempo_bpm INTEGER DEFAULT 120,
    duration_minutes INTEGER DEFAULT 5,
    audio_file_path TEXT,
    tablature_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    completion_percentage DECIMAL(5,2) DEFAULT 0.0,
    best_score DECIMAL(5,2),
    practice_count INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exercise_id)
);

-- App version checks (from previous migration)
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

-- App versions configuration
CREATE TABLE IF NOT EXISTS app_versions (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) UNIQUE NOT NULL,
    current_version VARCHAR(20) NOT NULL,
    min_supported_version VARCHAR(20) NOT NULL,
    codepush_deployment_key TEXT,
    force_update BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_difficulty ON songs(overall_difficulty);
CREATE INDEX IF NOT EXISTS idx_song_chords_song_id ON song_chords(song_id);
CREATE INDEX IF NOT EXISTS idx_song_tablature_song_id ON song_tablature(song_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_song_id ON practice_sessions(song_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_start_time ON practice_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_user_saved_songs_user_id ON user_saved_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_songs_song_id ON user_saved_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_songs_youtube_id ON songs(youtube_id);
CREATE INDEX IF NOT EXISTS idx_songs_song_id ON songs(song_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_job_id ON processing_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises(exercise_type);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_exercise_id ON user_progress(exercise_id);
CREATE INDEX IF NOT EXISTS idx_app_version_checks_platform ON app_version_checks(platform);
CREATE INDEX IF NOT EXISTS idx_app_version_checks_created_at ON app_version_checks(created_at);

-- Insert default data
INSERT INTO techniques (technique, description) VALUES
('strumming', 'Basic strumming patterns and techniques'),
('fingerpicking', 'Fingerstyle guitar techniques'),
('bending', 'String bending techniques'),
('hammer-on', 'Hammer-on techniques'),
('pull-off', 'Pull-off techniques'),
('slide', 'Slide techniques'),
('vibrato', 'Vibrato techniques'),
('palm_mute', 'Palm muting techniques'),
('barre_chords', 'Barre chord techniques'),
('power_chords', 'Power chord techniques')
ON CONFLICT DO NOTHING;

-- Insert default app versions
INSERT INTO app_versions (platform, current_version, min_supported_version, force_update) VALUES
('ios', '1.0.0', '1.0.0', FALSE),
('android', '1.0.0', '1.0.0', FALSE)
ON CONFLICT (platform) DO NOTHING;

-- Insert some sample exercises
INSERT INTO exercises (title, description, exercise_type, difficulty_level, target_techniques, tempo_bpm) VALUES
('Basic C Major Scale', 'Learn the C major scale pattern', 'scale', 1.0, ARRAY['fingerpicking'], 80),
('Strumming Pattern 1', 'Basic down-down-up-up-down-up pattern', 'strumming', 2.0, ARRAY['strumming'], 100),
('G Major Chord', 'Practice G major chord transition', 'chord', 1.0, ARRAY['barre_chords'], 90)
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_sessions_updated_at BEFORE UPDATE ON practice_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_versions_updated_at BEFORE UPDATE ON app_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();