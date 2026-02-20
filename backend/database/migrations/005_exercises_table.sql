-- Migration: Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
    exercise_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    skill_level VARCHAR(50) NOT NULL,
    style VARCHAR(50) NOT NULL,
    tempo INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    key VARCHAR(5) NOT NULL,
    audio_path TEXT,
    tablature JSONB,
    instructions JSONB,
    variations JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_skill_level ON exercises(skill_level);
