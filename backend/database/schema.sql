-- ZEZE Guitar Learning Database Schema
-- Standard PostgreSQL (compatible with Supabase)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    hashed_password VARCHAR(255),
    auth_provider VARCHAR(20) DEFAULT 'email',
    provider_id VARCHAR(255),
    
    -- User Preferences
    skill_level INTEGER DEFAULT 1 CHECK (skill_level BETWEEN 1 AND 10),
    preferred_genres VARCHAR(100)[] DEFAULT '{}',
    practice_goal VARCHAR(50),
    daily_reminder_time TIME,
    notify_on_completion BOOLEAN DEFAULT true,
    
    -- Device & Session Info
    current_device_id VARCHAR(255),
    last_ip_address INET,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Subscription
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    
    -- Analytics
    total_practice_time INTEGER DEFAULT 0,
    songs_learned INTEGER DEFAULT 0,
    consecutive_days INTEGER DEFAULT 0,
    last_streak_date DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_skill_level ON users(skill_level);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
    song_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    youtube_id VARCHAR(20) UNIQUE,
    spotify_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    release_year INTEGER,
    duration_seconds INTEGER NOT NULL,
    
    -- Audio Analysis Results
    original_key VARCHAR(5),
    tempo_bpm DECIMAL(5,2),
    time_signature VARCHAR(10),
    energy_level DECIMAL(3,2),
    valence DECIMAL(3,2),
    
    -- Processing Metadata
    chord_progression JSONB,
    note_sequence JSONB,
    beat_grid JSONB,
    sections JSONB,
    techniques_identified JSONB,
    
    -- Difficulty Scoring
    overall_difficulty DECIMAL(3,2) CHECK (overall_difficulty BETWEEN 0.0 AND 10.0),
    chord_difficulty DECIMAL(3,2),
    solo_difficulty DECIMAL(3,2),
    rhythm_difficulty DECIMAL(3,2),
    speed_difficulty DECIMAL(3,2),
    
    -- Audio Files
    original_audio_url VARCHAR(500),
    processed_audio_url VARCHAR(500),
    waveform_data JSONB,
    
    -- Processing Status
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_progress INTEGER DEFAULT 0,
    processing_errors TEXT[],
    
    -- Cached Data
    thumbnail_url VARCHAR(500),
    popularity_score DECIMAL(5,2) DEFAULT 0.0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ
);

-- Create indexes for songs
CREATE INDEX IF NOT EXISTS idx_songs_youtube_id ON songs(youtube_id);
CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_difficulty ON songs(overall_difficulty);
CREATE INDEX IF NOT EXISTS idx_songs_key ON songs(original_key);
CREATE INDEX IF NOT EXISTS idx_songs_tempo ON songs(tempo_bpm);
CREATE INDEX IF NOT EXISTS idx_songs_popularity ON songs(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at);
CREATE INDEX IF NOT EXISTS idx_songs_processing_status ON songs(processing_status);

-- User Songs junction table (saved songs)
CREATE TABLE IF NOT EXISTS user_songs (
    user_song_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(song_id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_practiced_at TIMESTAMPTZ,
    practice_count INTEGER DEFAULT 0,
    
    UNIQUE(user_id, song_id)
);

-- Create indexes for user_songs
CREATE INDEX IF NOT EXISTS idx_user_songs_user_id ON user_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_songs_song_id ON user_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_user_songs_saved_at ON user_songs(saved_at);

-- Practice Sessions table (will be converted to TimescaleDB hypertable)
CREATE TABLE IF NOT EXISTS practice_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(song_id) ON DELETE SET NULL,
    user_song_id UUID REFERENCES user_songs(user_song_id) ON DELETE CASCADE,
    
    -- Session Info
    session_type VARCHAR(20) DEFAULT 'song_practice' CHECK (session_type IN ('song_practice', 'technique_drill', 'free_play')),
    focus_techniques VARCHAR(50)[],
    tempo_percentage INTEGER DEFAULT 100 CHECK (tempo_percentage BETWEEN 25 AND 200),
    transposition_key VARCHAR(5),
    
    -- Timing
    start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Performance Metrics
    overall_accuracy DECIMAL(5,2) CHECK (overall_accuracy BETWEEN 0.0 AND 100.0),
    timing_accuracy DECIMAL(5,2) CHECK (timing_accuracy BETWEEN 0.0 AND 100.0),
    pitch_accuracy DECIMAL(5,2) CHECK (pitch_accuracy BETWEEN 0.0 AND 100.0),
    rhythm_accuracy DECIMAL(5,2) CHECK (rhythm_accuracy BETWEEN 0.0 AND 100.0),
    
    -- Detailed Metrics
    chord_accuracy JSONB,
    section_accuracy JSONB,
    mistakes JSONB,
    improvement_areas JSONB,
    
    -- Session Stats
    notes_played INTEGER,
    chords_played INTEGER,
    techniques_used JSONB,
    max_speed_bpm DECIMAL(5,2),
    avg_speed_bpm DECIMAL(5,2),
    
    -- User Feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    session_notes TEXT,
    
    -- Device Info
    device_type VARCHAR(50),
    app_version VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Note: practice_sessions is optimized for time-series queries with appropriate indexes

-- Create indexes for practice_sessions
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_song_id ON practice_sessions(song_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_start_time ON practice_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_session_type ON practice_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_accuracy ON practice_sessions(overall_accuracy);

-- Practice Analysis table for real-time data
CREATE TABLE IF NOT EXISTS practice_analysis (
    analysis_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES practice_sessions(session_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_chord VARCHAR(10),
    accuracy DECIMAL(5,2),
    mistake_detected JSONB,
    encouragement TEXT,
    pitch_data JSONB,
    timing_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Note: practice_analysis is optimized for time-series queries with appropriate indexes

-- Create indexes for practice_analysis
CREATE INDEX IF NOT EXISTS idx_practice_analysis_session_id ON practice_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_analysis_timestamp ON practice_analysis(timestamp DESC);

-- Techniques table
CREATE TABLE IF NOT EXISTS techniques (
    technique_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    
    -- Difficulty & Metadata
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 10),
    prerequisite_techniques UUID[],
    related_techniques UUID[],
    
    -- Instructional Content
    description TEXT NOT NULL,
    instructions JSONB,
    common_mistakes TEXT[],
    tips TEXT[],
    
    -- Visual Guides
    finger_positions JSONB,
    picking_patterns JSONB,
    fretboard_positions JSONB,
    notation_example TEXT,
    
    -- Media
    video_url VARCHAR(500),
    audio_example_url VARCHAR(500),
    diagram_url VARCHAR(500),
    
    -- Usage Stats
    popularity_score DECIMAL(5,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for techniques
CREATE INDEX IF NOT EXISTS idx_techniques_slug ON techniques(slug);
CREATE INDEX IF NOT EXISTS idx_techniques_category ON techniques(category);
CREATE INDEX IF NOT EXISTS idx_techniques_difficulty ON techniques(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_techniques_popularity ON techniques(popularity_score DESC);

-- Chords table
CREATE TABLE IF NOT EXISTS chords (
    chord_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    notation VARCHAR(10) NOT NULL,
    root_note VARCHAR(5) NOT NULL,
    chord_type VARCHAR(20) NOT NULL,
    intervals INTEGER[],
    
    -- Fingering Variations
    basic_fingering JSONB,
    alternative_fingerings JSONB[],
    barre_positions INTEGER[],
    capo_positions JSONB,
    
    -- Difficulty
    difficulty_level INTEGER,
    common_progressions JSONB,
    
    -- Theory
    scale_relationship VARCHAR(100)[],
    notes VARCHAR(50)[],
    roman_numeral VARCHAR(10),
    
    -- Usage Stats
    popularity_score DECIMAL(5,2) DEFAULT 0.0,
    usage_frequency INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(notation, root_note, chord_type)
);

-- Create indexes for chords
CREATE INDEX IF NOT EXISTS idx_chords_name ON chords(name);
CREATE INDEX IF NOT EXISTS idx_chords_notation ON chords(notation);
CREATE INDEX IF NOT EXISTS idx_chords_root_note ON chords(root_note);
CREATE INDEX IF NOT EXISTS idx_chords_difficulty ON chords(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_chords_popularity ON chords(popularity_score DESC);

-- Song Techniques junction table
CREATE TABLE IF NOT EXISTS song_techniques (
    song_technique_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID NOT NULL REFERENCES songs(song_id) ON DELETE CASCADE,
    technique_id UUID NOT NULL REFERENCES techniques(technique_id) ON DELETE CASCADE,
    sections JSONB, -- Which sections this technique appears in
    confidence DECIMAL(3,2), -- How confident we are about this classification
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(song_id, technique_id)
);

-- Create indexes for song_techniques
CREATE INDEX IF NOT EXISTS idx_song_techniques_song_id ON song_techniques(song_id);
CREATE INDEX IF NOT EXISTS idx_song_techniques_technique_id ON song_techniques(technique_id);

-- System Logs table (TimescaleDB for log analysis)
CREATE TABLE IF NOT EXISTS system_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    service VARCHAR(50),
    user_id UUID REFERENCES users(user_id),
    session_id UUID,
    request_id VARCHAR(36),
    ip_address INET,
    user_agent TEXT,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Note: system_logs is optimized for time-series queries with appropriate indexes

-- Create indexes for system_logs
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON system_logs(service);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);

-- Create views for common queries

-- User Progress Summary View
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT 
    u.user_id,
    u.email,
    u.username,
    u.display_name,
    u.skill_level,
    u.total_practice_time,
    u.songs_learned,
    u.consecutive_days,
    u.last_streak_date,
    u.created_at as user_created_at,
    u.last_login_at,
    
    -- Aggregated Stats
    COUNT(DISTINCT us.song_id) as total_songs_saved,
    COUNT(DISTINCT ps.session_id) as total_sessions,
    AVG(ps.overall_accuracy) as avg_session_accuracy,
    SUM(ps.duration_seconds) as total_practice_time_calculated,
    
    -- Recent Activity
    MAX(ps.start_time) as last_practice_time,
    COUNT(DISTINCT ps.session_id) FILTER (WHERE ps.start_time >= NOW() - INTERVAL '7 days') as sessions_last_7_days,
    
    -- Song Statistics
    COUNT(DISTINCT st.technique_id) as techniques_attempted
    
FROM users u
LEFT JOIN user_songs us ON u.user_id = us.user_id
LEFT JOIN practice_sessions ps ON u.user_id = ps.user_id
LEFT JOIN song_techniques st ON us.song_id = st.song_id
WHERE u.deleted_at IS NULL
GROUP BY u.user_id, u.email, u.username, u.display_name, u.skill_level, 
         u.total_practice_time, u.songs_learned, u.consecutive_days, u.last_streak_date,
         u.created_at, u.last_login_at;

-- Popular Songs View
CREATE OR REPLACE VIEW popular_songs AS
SELECT 
    s.song_id,
    s.title,
    s.artist,
    s.album,
    s.duration_seconds,
    s.original_key,
    s.tempo_bpm,
    s.overall_difficulty,
    s.thumbnail_url,
    s.popularity_score,
    
    -- Calculated popularity metrics
    COUNT(DISTINCT us.user_id) as unique_saves,
    COUNT(DISTINCT ps.user_id) as unique_players,
    COUNT(ps.session_id) as total_practice_sessions,
    AVG(ps.overall_accuracy) as avg_user_accuracy,
    COUNT(DISTINCT ps.user_id) FILTER (WHERE ps.start_time > NOW() - INTERVAL '7 days') as recent_players,
    
    -- Last accessed
    MAX(ps.start_time) as last_practiced,
    s.last_accessed_at
    
FROM songs s
LEFT JOIN user_songs us ON s.song_id = us.song_id
LEFT JOIN practice_sessions ps ON s.song_id = ps.song_id
WHERE s.processing_status = 'completed'
GROUP BY s.song_id, s.title, s.artist, s.album, s.duration_seconds, 
         s.original_key, s.tempo_bpm, s.overall_difficulty, s.thumbnail_url,
         s.popularity_score, s.last_accessed_at
ORDER BY s.popularity_score DESC;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_techniques_updated_at
    BEFORE UPDATE ON techniques
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE chords ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Songs table policies (public read, authenticated write)
CREATE POLICY "Anyone can view songs" ON songs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert songs" ON songs
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update songs" ON songs
    FOR UPDATE TO authenticated USING (true);

-- User Songs policies (personal library)
CREATE POLICY "Users can view their saved songs" ON user_songs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save songs to their library" ON user_songs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove songs from their library" ON user_songs
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update their saved songs" ON user_songs
    FOR UPDATE USING (auth.uid() = user_id);

-- Practice Sessions policies
CREATE POLICY "Users can view their practice sessions" ON practice_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create practice sessions" ON practice_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their practice sessions" ON practice_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Practice Analysis policies
CREATE POLICY "Users can view their practice analysis" ON practice_analysis
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM practice_sessions WHERE session_id = practice_analysis.session_id
        )
    );

CREATE POLICY "Users can create practice analysis" ON practice_analysis
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM practice_sessions WHERE session_id = practice_analysis.session_id
        )
    );

-- Techniques policies (public read)
CREATE POLICY "Anyone can view techniques" ON techniques
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only service role can modify techniques" ON techniques
    FOR ALL TO service_role USING (true);

-- Chords policies (public read)
CREATE POLICY "Anyone can view chords" ON chords
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only service role can modify chords" ON chords
    FOR ALL TO service_role USING (true);

-- Song Techniques policies (public read)
CREATE POLICY "Anyone can view song techniques" ON song_techniques
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only service role can modify song techniques" ON song_techniques
    FOR ALL TO service_role USING (true);

-- System Logs policies (service role only)
CREATE POLICY "Only service role can access system logs" ON system_logs
    FOR ALL TO service_role USING (true);