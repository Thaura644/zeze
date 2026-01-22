-- Migration 003: Add New Features Schema
-- Adds tables for payments, notifications, devices, and enhanced features

-- ===================================
-- PAYMENT AND SUBSCRIPTION TABLES
-- ===================================

-- Add payment-related columns to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- succeeded, failed, pending, refunded
  stripe_invoice_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  description TEXT,
  paid_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_paid_at ON payment_history(paid_at);

-- ===================================
-- NOTIFICATION TABLES
-- ===================================

-- User devices for push notifications
CREATE TABLE IF NOT EXISTS user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  device_type VARCHAR(50), -- ios, android, web
  device_name VARCHAR(255),
  last_active TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_active ON user_devices(last_active);

-- Notification log
CREATE TABLE IF NOT EXISTS notification_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50), -- daily_reminder, weekly_summary, milestone, song_ready, etc.
  data JSONB,
  sent_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(type);

-- Add notification preferences to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS daily_reminder_time TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS reminder_days JSONB DEFAULT '["mon","tue","wed","thu","fri","sat","sun"]',
ADD COLUMN IF NOT EXISTS achievement_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS progress_notifications BOOLEAN DEFAULT TRUE;

-- ===================================
-- ENHANCED SONG FEATURES
-- ===================================

-- Add additional columns to songs table
ALTER TABLE songs
ADD COLUMN IF NOT EXISTS structure JSONB, -- Intro, verse, chorus timestamps
ADD COLUMN IF NOT EXISTS tags TEXT[], -- Searchable tags
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_songs_tags ON songs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_songs_view_count ON songs(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_songs_save_count ON songs(save_count DESC);

-- Song ratings
CREATE TABLE IF NOT EXISTS song_ratings (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(song_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_song_ratings_song_id ON song_ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_song_ratings_user_id ON song_ratings(user_id);

-- ===================================
-- OFFLINE SYNC TABLES
-- ===================================

-- Offline songs tracking
CREATE TABLE IF NOT EXISTS offline_songs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW(),
  file_size_bytes BIGINT,
  UNIQUE(user_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_offline_songs_user_id ON offline_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_songs_song_id ON offline_songs(song_id);

-- ===================================
-- ACHIEVEMENTS AND GAMIFICATION
-- ===================================

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category VARCHAR(100), -- practice, technique, milestone, social
  icon_url TEXT,
  requirement JSONB NOT NULL, -- Condition for achievement
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);

-- User stats for leaderboards
CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_practice_time INTEGER DEFAULT 0, -- in seconds
  total_sessions INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  total_songs_learned INTEGER DEFAULT 0,
  total_techniques_mastered INTEGER DEFAULT 0,
  average_accuracy DECIMAL(5,2) DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  rank INTEGER,
  last_practice_date DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_stats_total_points ON user_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_rank ON user_stats(rank);

-- ===================================
-- SOCIAL FEATURES
-- ===================================

-- User connections (following system)
CREATE TABLE IF NOT EXISTS user_connections (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_connections_follower ON user_connections(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_following ON user_connections(following_id);

-- Shared songs
CREATE TABLE IF NOT EXISTS shared_songs (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  shared_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL means public
  message TEXT,
  share_url VARCHAR(500) UNIQUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_songs_shared_by ON shared_songs(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_songs_shared_with ON shared_songs(shared_with);
CREATE INDEX IF NOT EXISTS idx_shared_songs_share_url ON shared_songs(share_url);

-- ===================================
-- ENHANCED PRACTICE FEATURES
-- ===================================

-- Add detailed practice metrics
ALTER TABLE practice_sessions
ADD COLUMN IF NOT EXISTS metadata JSONB, -- Additional session data
ADD COLUMN IF NOT EXISTS difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
ADD COLUMN IF NOT EXISTS user_notes TEXT;

-- Practice milestones
CREATE TABLE IF NOT EXISTS practice_milestones (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type VARCHAR(100) NOT NULL, -- first_session, 10_sessions, 100_hours, etc.
  milestone_data JSONB,
  achieved_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_milestones_user_id ON practice_milestones(user_id);

-- ===================================
-- CONTENT MODERATION
-- ===================================

-- Reported content
CREATE TABLE IF NOT EXISTS reported_content (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL, -- song, user, comment
  content_id INTEGER NOT NULL,
  reported_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reported_content_status ON reported_content(status);
CREATE INDEX IF NOT EXISTS idx_reported_content_created_at ON reported_content(created_at);

-- ===================================
-- ADMIN FEATURES
-- ===================================

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- super_admin, admin, moderator
  permissions JSONB, -- Specific permissions
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id INTEGER,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ===================================
-- DATA INTEGRITY AND CONSTRAINTS
-- ===================================

-- Function to update user stats automatically
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_stats
  SET
    total_sessions = total_sessions + 1,
    total_practice_time = total_practice_time + COALESCE(NEW.duration, 0),
    last_practice_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;

  -- Create user_stats row if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id, total_sessions, total_practice_time, last_practice_date)
    VALUES (NEW.user_id, 1, COALESCE(NEW.duration, 0), CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when practice session ends
DROP TRIGGER IF EXISTS trigger_update_user_stats ON practice_sessions;
CREATE TRIGGER trigger_update_user_stats
  AFTER INSERT ON practice_sessions
  FOR EACH ROW
  WHEN (NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION update_user_stats();

-- Function to update song statistics
CREATE OR REPLACE FUNCTION update_song_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE songs SET save_count = save_count + 1 WHERE id = NEW.song_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE songs SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.song_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update song save count
DROP TRIGGER IF EXISTS trigger_update_song_save_count ON user_songs;
CREATE TRIGGER trigger_update_song_save_count
  AFTER INSERT OR DELETE ON user_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_song_stats();

-- Function to update average rating
CREATE OR REPLACE FUNCTION update_song_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL;
  total INTEGER;
BEGIN
  SELECT AVG(rating), COUNT(*) INTO avg_rating, total
  FROM song_ratings
  WHERE song_id = COALESCE(NEW.song_id, OLD.song_id);

  UPDATE songs
  SET
    average_rating = avg_rating,
    total_ratings = total
  WHERE id = COALESCE(NEW.song_id, OLD.song_id);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update song ratings
DROP TRIGGER IF EXISTS trigger_update_song_rating ON song_ratings;
CREATE TRIGGER trigger_update_song_rating
  AFTER INSERT OR UPDATE OR DELETE ON song_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_song_rating();

-- ===================================
-- INSERT DEFAULT DATA
-- ===================================

-- Insert default achievements
INSERT INTO achievements (name, description, category, requirement, points) VALUES
  ('First Steps', 'Complete your first practice session', 'practice', '{"type": "sessions", "count": 1}', 10),
  ('Getting Started', 'Complete 10 practice sessions', 'practice', '{"type": "sessions", "count": 10}', 50),
  ('Dedicated Learner', 'Complete 50 practice sessions', 'practice', '{"type": "sessions", "count": 50}', 200),
  ('Practice Master', 'Complete 100 practice sessions', 'practice', '{"type": "sessions", "count": 100}', 500),
  ('One Hour Down', 'Practice for a total of 1 hour', 'milestone', '{"type": "practice_time", "hours": 1}', 25),
  ('Ten Hours Strong', 'Practice for a total of 10 hours', 'milestone', '{"type": "practice_time", "hours": 10}', 100),
  ('Hundred Hours Hero', 'Practice for a total of 100 hours', 'milestone', '{"type": "practice_time", "hours": 100}', 1000),
  ('Week Warrior', 'Maintain a 7-day practice streak', 'streak', '{"type": "streak", "days": 7}', 100),
  ('Month Master', 'Maintain a 30-day practice streak', 'streak', '{"type": "streak", "days": 30}', 500),
  ('Perfect Practice', 'Achieve 95%+ accuracy in a session', 'technique', '{"type": "accuracy", "min": 95}', 150),
  ('Song Starter', 'Learn your first song', 'milestone', '{"type": "songs_learned", "count": 1}', 50),
  ('Song Scholar', 'Learn 10 songs', 'milestone', '{"type": "songs_learned", "count": 10}', 300),
  ('Technique Novice', 'Master your first technique', 'technique', '{"type": "techniques_mastered", "count": 1}', 50),
  ('Technique Expert', 'Master 10 techniques', 'technique', '{"type": "techniques_mastered", "count": 10}', 400)
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('max_free_songs_per_month', '5', 'Maximum songs a free user can process per month'),
  ('max_offline_songs', '{"free": 0, "basic": 10, "premium": 100}', 'Maximum offline songs by tier'),
  ('enable_social_features', 'true', 'Enable social features globally'),
  ('maintenance_mode', 'false', 'Enable maintenance mode')
ON CONFLICT (key) DO NOTHING;

COMMIT;
