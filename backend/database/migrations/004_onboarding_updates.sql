-- Migration for Onboarding and Chord Timelines
-- Adds tuning to users and creates a separate chord_timelines table for more detailed tracking

-- Add preferred_tuning to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_tuning JSONB DEFAULT '["E2","A2","D3","G3","B3","E4"]';
ALTER TABLE users ALTER COLUMN email DROP NOT NULL; -- Allow null email for guest users

-- Create chord_timelines table
CREATE TABLE IF NOT EXISTS chord_timelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID NOT NULL REFERENCES songs(song_id) ON DELETE CASCADE,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    chord_label VARCHAR(50) NOT NULL,
    fret_positions JSONB, -- fingers per string; null if unknown
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create index for chord_timelines
CREATE INDEX IF NOT EXISTS idx_chord_timelines_song_id ON chord_timelines(song_id);
CREATE INDEX IF NOT EXISTS idx_chord_timelines_start_ms ON chord_timelines(start_ms);

-- Add jobs table for better tracking as suggested by proposal
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'youtube_extraction', 'audio_analysis', etc.
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'done', 'failed'
    payload JSONB,
    result JSONB,
    progress INTEGER DEFAULT 0,
    message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
