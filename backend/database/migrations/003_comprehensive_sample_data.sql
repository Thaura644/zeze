-- Migration: Add comprehensive sample data for testing
-- This migration adds users, songs, techniques, and practice data

-- Insert sample users with proper password hashing
INSERT INTO users (
  user_id, email, username, display_name, hashed_password, skill_level,
  preferred_genres, practice_goal, created_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440200'::uuid,
  'john@guitarlearner.com',
  'johnguitar',
  'John Guitar',
  '$2b$12$LQv3c1yqBwQJJib2fCz9u.tJtqJKhdQmm5dQf5Q5YIqQhX9f.su2', -- 'password123'
  3,
  ARRAY['rock', 'pop', 'blues'],
  'Learn 10 new songs this month',
  CURRENT_TIMESTAMP
),
(
  '550e8400-e29b-41d4-a716-446655440201'::uuid,
  'sarah@songwriter.com',
  'sarahplays',
  'Sarah Plays',
  '$2b$12$LQv3c1yqBwQJJib2fCz9u.tJtqJKhdQmm5dQf5Q5YIqQhX9f.su2', -- 'password123'
  5,
  ARRAY['folk', 'indie', 'acoustic'],
  'Master fingerpicking techniques',
  CURRENT_TIMESTAMP
),
(
  '550e8400-e29b-41d4-a716-446655440202'::uuid,
  'mike@shredmaster.com',
  'mikeshreds',
  'Mike Shreds',
  '$2b$12$LQv3c1yqBwQJJib2fCz9u.tJtqJKhdQmm5dQf5Q5YIqQhX9f.su2', -- 'password123'
  7,
  ARRAY['metal', 'rock', 'progressive'],
  'Improve solo speed and accuracy',
  CURRENT_TIMESTAMP - INTERVAL '30 days'
),
(
  '550e8400-e29b-41d4-a716-446655440203'::uuid,
  'emma@beginner.com',
  'emmabegins',
  'Emma Begins',
  '$2b$12$LQv3c1yqBwQJJib2fCz9u.tJtqJKhdQmm5dQf5Q5YIqQhX9f.su2', -- 'password123'
  1,
  ARRAY['pop', 'acoustic'],
  'Learn basic chords and songs',
  CURRENT_TIMESTAMP - INTERVAL '7 days'
)
ON CONFLICT (email) DO NOTHING;

-- Insert comprehensive sample songs
INSERT INTO songs (
  song_id, youtube_id, title, artist, album, release_year, duration_seconds,
  original_key, tempo_bpm, time_signature, energy_level, valence,
  chord_progression, overall_difficulty, chord_difficulty,
  rhythm_difficulty, processing_status, thumbnail_url, popularity_score
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440300'::uuid,
  'hLQl3wQQbQ0',
  'Wonderwall',
  'Oasis',
  '(What''s the Story) Morning Glory?',
  1995,
  258,
  'G major',
  86.5,
  '4/4',
  0.7,
  0.8,
  '[
    {"chord": "Em", "start_time": 0.0, "duration": 3.5, "confidence": 0.95},
    {"chord": "C", "start_time": 3.5, "duration": 2.0, "confidence": 0.92},
    {"chord": "D", "start_time": 5.5, "duration": 2.0, "confidence": 0.90},
    {"chord": "G", "start_time": 7.5, "duration": 4.0, "confidence": 0.88}
  ]'::jsonb,
  3.2,
  2.5,
  3.0,
  'completed',
  'https://i.ytimg.com/vi/hLQl3wQQbQ0/mqdefault.jpg',
  8.7
),
(
  '550e8400-e29b-41d4-a716-446655440301'::uuid,
  'QDYfEBY9Nm0',
  'Let It Be',
  'The Beatles',
  'Let It Be',
  1970,
  243,
  'C major',
  72.0,
  '4/4',
  0.5,
  0.7,
  '[
    {"chord": "C", "start_time": 0.0, "duration": 4.0, "confidence": 0.94},
    {"chord": "G", "start_time": 4.0, "duration": 4.0, "confidence": 0.91},
    {"chord": "Am", "start_time": 8.0, "duration": 4.0, "confidence": 0.89},
    {"chord": "F", "start_time": 12.0, "duration": 4.0, "confidence": 0.87}
  ]'::jsonb,
  2.8,
  2.0,
  2.5,
  'completed',
  'https://i.ytimg.com/vi/QDYfEBY9Nm0/mqdefault.jpg',
  9.2
),
(
  '550e8400-e29b-41d4-a716-446655440302'::uuid,
  '5VCE6A91R1o',
  'Sweet Child O'' Mine',
  'Guns N'' Roses',
  'Appetite for Destruction',
  1987,
  357,
  'D major',
  125.0,
  '4/4',
  0.9,
  0.6,
  '[
    {"chord": "D", "start_time": 0.0, "duration": 4.0, "confidence": 0.93},
    {"chord": "C", "start_time": 4.0, "duration": 4.0, "confidence": 0.90},
    {"chord": "G", "start_time": 8.0, "duration": 4.0, "confidence": 0.88}
  ]'::jsonb,
  4.5,
  3.5,
  4.0,
  'completed',
  'https://i.ytimg.com/vi/5VCE6A91R1o/mqdefault.jpg',
  8.9
),
(
  '550e8400-e29b-41d4-a716-446655440303'::uuid,
  '9QdVJtA9w8U',
  'Stairway to Heaven',
  'Led Zeppelin',
  'Led Zeppelin IV',
  1971,
  482,
  'A minor',
  82.0,
  '4/4',
  0.4,
  0.5,
  '[
    {"chord": "Am", "start_time": 0.0, "duration": 8.0, "confidence": 0.95},
    {"chord": "C", "start_time": 8.0, "duration": 4.0, "confidence": 0.92},
    {"chord": "D", "start_time": 12.0, "duration": 4.0, "confidence": 0.89},
    {"chord": "F", "start_time": 16.0, "duration": 8.0, "confidence": 0.87}
  ]'::jsonb,
  5.8,
  4.5,
  5.0,
  'completed',
  'https://i.ytimg.com/vi/9QdVJtA9w8U/mqdefault.jpg',
  7.8
),
(
  '550e8400-e29b-41d4-a716-446655440304'::uuid,
  'a_426Riw0f8',
  'Hotel California',
  'Eagles',
  'Hotel California',
  1976,
  391,
  'B minor',
  75.0,
  '4/4',
  0.6,
  0.4,
  '[
    {"chord": "Bm", "start_time": 0.0, "duration": 8.0, "confidence": 0.94},
    {"chord": "F#", "start_time": 8.0, "duration": 8.0, "confidence": 0.91},
    {"chord": "A", "start_time": 16.0, "duration": 8.0, "confidence": 0.89},
    {"chord": "E", "start_time": 24.0, "duration": 8.0, "confidence": 0.92}
  ]'::jsonb,
  4.2,
  3.8,
  4.5,
  'completed',
  'https://i.ytimg.com/vi/a_426Riw0f8/mqdefault.jpg',
  8.1
),
(
  '550e8400-e29b-41d4-a716-446655440305'::uuid,
  'kJQP7kiw5Fk',
  'Yesterday',
  'The Beatles',
  'Help!',
  1965,
  125,
  'F major',
  96.0,
  '4/4',
  0.3,
  0.6,
  '[
    {"chord": "F", "start_time": 0.0, "duration": 4.0, "confidence": 0.96},
    {"chord": "Em", "start_time": 4.0, "duration": 4.0, "confidence": 0.93},
    {"chord": "Dm", "start_time": 8.0, "duration": 4.0, "confidence": 0.91},
    {"chord": "C", "start_time": 12.0, "duration": 4.0, "confidence": 0.89}
  ]'::jsonb,
  3.5,
  2.8,
  3.2,
  'completed',
  'https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg',
  7.5
)
ON CONFLICT (youtube_id) DO NOTHING;

-- Link songs with techniques
INSERT INTO song_techniques (song_id, technique_id, sections, confidence)
SELECT s.song_id, t.technique_id, '["intro", "verse", "chorus"]'::jsonb, 0.85
FROM songs s, techniques t
WHERE s.title IN ('Wonderwall', 'Let It Be', 'Yesterday')
AND t.category IN ('chords', 'rhythm')
AND t.difficulty_level <= 3
ON CONFLICT (song_id, technique_id) DO NOTHING;

INSERT INTO song_techniques (song_id, technique_id, sections, confidence)
SELECT s.song_id, t.technique_id, '["solo", "bridge", "outro"]'::jsonb, 0.80
FROM songs s, techniques t
WHERE s.title IN ('Sweet Child O'' Mine', 'Stairway to Heaven', 'Hotel California')
AND t.category IN ('solo', 'technique')
AND t.difficulty_level >= 3
ON CONFLICT (song_id, technique_id) DO NOTHING;

-- Add user song saves
INSERT INTO user_songs (user_id, song_id, practice_count, saved_at)
SELECT u.user_id, s.song_id, floor(random() * 10 + 1), CURRENT_TIMESTAMP - (random() * 30 || ' days')::interval
FROM users u, songs s
WHERE u.skill_level >= s.overall_difficulty - 1
AND u.skill_level <= s.overall_difficulty + 2
ON CONFLICT (user_id, song_id) DO NOTHING;

-- Add practice sessions
INSERT INTO practice_sessions (
  user_id, song_id, session_type, focus_techniques,
  start_time, end_time, duration_seconds,
  overall_accuracy, timing_accuracy, pitch_accuracy, rhythm_accuracy,
  notes_played, chords_played, user_rating, session_notes
)
SELECT
  u.user_id,
  us.song_id,
  CASE WHEN random() > 0.7 THEN 'technique_drill' ELSE 'song_practice' END,
  CASE
    WHEN random() > 0.6 THEN ARRAY['strumming-patterns', 'chord-transitions']
    WHEN random() > 0.3 THEN ARRAY['hammer-ons', 'fingerpicking']
    ELSE ARRAY['pentatonic-scale', 'arpeggios']
  END,
  CURRENT_TIMESTAMP - (random() * 14 || ' days')::interval,
  CURRENT_TIMESTAMP - (random() * 14 || ' days')::interval + (random() * 3600 || ' seconds')::interval,
  floor(random() * 3600 + 600), -- 10-70 minutes
  70.0 + random() * 25.0, -- 70-95% accuracy
  75.0 + random() * 20.0,
  65.0 + random() * 30.0,
  78.0 + random() * 17.0,
  floor(random() * 500 + 100),
  floor(random() * 50 + 10),
  floor(random() * 4 + 2), -- 2-5 star rating
  CASE floor(random() * 5)
    WHEN 0 THEN 'Great session, feeling more confident!'
    WHEN 1 THEN 'Struggled with transitions but improving'
    WHEN 2 THEN 'Good practice, need to work on timing'
    WHEN 3 THEN 'Solid session, techniques coming together'
    ELSE 'Excellent progress today!'
  END
FROM users u
JOIN user_songs us ON u.user_id = us.user_id
WHERE random() < 0.8 -- 80% chance of having practice sessions
ORDER BY random()
LIMIT 20
ON CONFLICT DO NOTHING;