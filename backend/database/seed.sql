-- Sample data for ZEZE Guitar Learning Database
-- This file contains sample data for testing and development

-- Sample techniques
INSERT INTO techniques (
  technique_id, name, slug, category, difficulty_level, description,
  instructions, common_mistakes, tips
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Basic Strumming',
  'basic-strumming',
  'rhythm',
  1,
  'Fundamental down-up strumming pattern for guitar',
  '["Keep wrist relaxed", "Use consistent motion", "Start with downstrokes only"]'::jsonb,
  '["Too much arm movement", "Inconsistent timing"]'::text[],
  '["Practice with metronome", "Start slowly"]'::text[]
),
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Hammer-ons & Pull-offs',
  'hammer-ons',
  'technique',
  2,
  'Build speed and accuracy with legato techniques.',
  '["Place finger on fret", "Pick the note", "Quickly hammer second finger down", "Release pressure to let note ring"]'::jsonb,
  '["Not hammering firmly enough", "Timing the hammer incorrectly"]'::text[],
  '["Practice slowly at first", "Use a metronome", "Focus on clean sound"]'::text[]
),
(
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'Strumming Patterns',
  'strumming-patterns',
  'rhythm',
  1,
  'Practice common strumming patterns and tempo control.',
  '["Hold pick correctly", "Practice downstrokes first", "Add upstrokes gradually", "Maintain consistent tempo"]'::jsonb,
  '["Inconsistent timing", "Too much arm movement"]'::text[],
  '["Start with simple down-up pattern", "Use a metronome", "Practice with songs you know"]'::text[]
),
(
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  'Pentatonic Scale',
  'pentatonic-scale',
  'solo',
  1,
  'Master the minor pentatonic scale for blues/rock solos.',
  '["Learn the basic box pattern", "Practice ascending and descending", "Add bends and vibrato", "Apply to simple chord progressions"]'::jsonb,
  '["Playing outside the scale", "Poor timing with bends"]'::text[],
  '["Start slow with a metronome", "Practice with backing tracks", "Learn multiple positions"]'::text[]
)
ON CONFLICT (slug) DO NOTHING;

-- Sample chords
INSERT INTO chords (
  chord_id, name, notation, root_note, chord_type, difficulty_level
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440100'::uuid,
  'C Major',
  'C',
  'C',
  'major',
  1
),
(
  '550e8400-e29b-41d4-a716-446655440101'::uuid,
  'G Major',
  'G',
  'G',
  'major',
  1
),
(
  '550e8400-e29b-41d4-a716-446655440102'::uuid,
  'D Major',
  'D',
  'D',
  'major',
  2
),
(
  '550e8400-e29b-41d4-a716-446655440103'::uuid,
  'E Minor',
  'Em',
  'E',
  'minor',
  1
),
(
  '550e8400-e29b-41d4-a716-446655440104'::uuid,
  'A Minor',
  'Am',
  'A',
  'minor',
  1
)
ON CONFLICT (notation, root_note, chord_type) DO NOTHING;

-- Sample songs
INSERT INTO songs (
    title, artist, album, release_year, duration_seconds, 
    original_key, tempo_bpm, time_signature, energy_level, valence,
    chord_progression, overall_difficulty, chord_difficulty, 
    rhythm_difficulty, processing_status, thumbnail_url, popularity_score
) VALUES
('Wonderwall', 'Oasis', '(What''s the Story) Morning Glory?', 1995, 258,
 'G major', 86.50, '4/4', 0.7, 0.8,
 '[
   {"chord": "Em", "start_time": 0.0, "duration": 3.5, "confidence": 0.95},
   {"chord": "C", "start_time": 3.5, "duration": 2.0, "confidence": 0.92},
   {"chord": "D", "start_time": 5.5, "duration": 2.0, "confidence": 0.90},
   {"chord": "G", "start_time": 7.5, "duration": 4.0, "confidence": 0.88}
 ]'::jsonb,
 3.2, 2.5, 3.0, 'completed', 
 'https://i.ytimg.com/vi/hLQl3wQQbQ0/mqdefault.jpg', 8.7),

('Let It Be', 'The Beatles', 'Let It Be', 1970, 243,
 'C major', 72.0, '4/4', 0.5, 0.7,
 '[
   {"chord": "C", "start_time": 0.0, "duration": 4.0, "confidence": 0.94},
   {"chord": "G", "start_time": 4.0, "duration": 4.0, "confidence": 0.91},
   {"chord": "Am", "start_time": 8.0, "duration": 4.0, "confidence": 0.89},
   {"chord": "F", "start_time": 12.0, "duration": 4.0, "confidence": 0.87}
 ]'::jsonb,
 2.8, 2.0, 2.5, 'completed',
 'https://i.ytimg.com/vi/QDYfEBY9Nm0/mqdefault.jpg', 9.2),

('Sweet Child O'' Mine', 'Guns N'' Roses', 'Appetite for Destruction', 1987, 357,
 'D major', 125.0, '4/4', 0.9, 0.6,
 '[
   {"chord": "D", "start_time": 0.0, "duration": 4.0, "confidence": 0.93},
   {"chord": "C", "start_time": 4.0, "duration": 4.0, "confidence": 0.90},
   {"chord": "G", "start_time": 8.0, "duration": 4.0, "confidence": 0.88}
 ]'::jsonb,
 4.5, 3.5, 4.0, 'completed',
 'https://i.ytimg.com/vi/5VCE6A91R1o/mqdefault.jpg', 8.9),

('Stairway to Heaven', 'Led Zeppelin', 'Led Zeppelin IV', 1971, 482,
 'A minor', 82.0, '4/4', 0.4, 0.5,
 '[
   {"chord": "Am", "start_time": 0.0, "duration": 8.0, "confidence": 0.95},
   {"chord": "C", "start_time": 8.0, "duration": 4.0, "confidence": 0.92},
   {"chord": "D", "start_time": 12.0, "duration": 4.0, "confidence": 0.89},
   {"chord": "F", "start_time": 16.0, "duration": 8.0, "confidence": 0.87},
   {"chord": "G", "start_time": 24.0, "duration": 4.0, "confidence": 0.91}
 ]'::jsonb,
 5.8, 4.5, 5.0, 'completed',
 'https://i.ytimg.com/vi/9QdVJtA9w8U/mqdefault.jpg', 7.8),

('Hotel California', 'Eagles', 'Hotel California', 1976, 391,
 'B minor', 75.0, '4/4', 0.6, 0.4,
 '[
   {"chord": "Bm", "start_time": 0.0, "duration": 8.0, "confidence": 0.94},
   {"chord": "F#", "start_time": 8.0, "duration": 8.0, "confidence": 0.91},
   {"chord": "A", "start_time": 16.0, "duration": 8.0, "confidence": 0.89},
   {"chord": "E", "start_time": 24.0, "duration": 8.0, "confidence": 0.92},
   {"chord": "G", "start_time": 32.0, "duration": 8.0, "confidence": 0.90}
 ]'::jsonb,
 4.2, 3.8, 4.5, 'completed',
 'https://i.ytimg.com/vi/a_426Riw0f8/mqdefault.jpg', 8.1);

-- Link songs with techniques
INSERT INTO song_techniques (song_id, technique_id, sections, confidence) 
SELECT s.song_id, t.technique_id, '["intro", "verse", "chorus"]'::jsonb, 0.85
FROM songs s, techniques t 
WHERE s.title IN ('Wonderwall', 'Let It Be') 
AND t.category IN ('rhythm', 'technique')
AND t.difficulty_level <= 3;

INSERT INTO song_techniques (song_id, technique_id, sections, confidence)
SELECT s.song_id, t.technique_id, '["intro", "solo", "outro"]'::jsonb, 0.80
FROM songs s, techniques t
WHERE s.title IN ('Sweet Child O'' Mine', 'Stairway to Heaven', 'Hotel California')
AND t.category IN ('lead');

-- Sample users for testing
INSERT INTO users (email, username, hashed_password, display_name, skill_level, preferred_genres, practice_goal) VALUES
('john@example.com', 'johnguitar', '$2b$12$LQv3c1yqBwQJJib2fCz9u.tJtqJKhdQmm5dQf5Q5YIqQhX9f.su2', 'John Guitar', 3, 
 ARRAY['rock', 'pop', 'blues'], 'Learn 10 new songs this month'),

('sarah@example.com', 'sarahplays', '$2b$12$LQv3c1yqBwQJJib2fCz9u.tJtqJKhdQmm5dQf5Q5YIqQhX9f.su2', 'Sarah Plays', 5,
 ARRAY['folk', 'indie', 'acoustic'], 'Master fingerpicking techniques'),

('mike@example.com', 'mikeshreds', '$2b$12$LQv3c1yqBwQJJib2fCz9u.tJtqJKhdQmm5dQf5Q5YIqQhX9f.su2', 'Mike Shreds', 7,
 ARRAY['metal', 'rock', 'progressive'], 'Improve solo speed and accuracy');

-- Passwords are all 'password123' for testing
-- In production, use proper password hashing

-- Sample practice sessions
INSERT INTO practice_sessions (
    user_id, song_id, session_type, focus_techniques, 
    start_time, end_time, duration_seconds,
    overall_accuracy, timing_accuracy, pitch_accuracy, rhythm_accuracy,
    notes_played, chords_played, user_rating, session_notes
)
SELECT 
    u.user_id, 
    s.song_id,
    'song_practice',
    ARRAY['basic-strumming', 'chord-transitions'],
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour',
    3600,
    75.5 + RANDOM() * 20,
    78.0 + RANDOM() * 15,
    72.5 + RANDOM() * 25,
    80.0 + RANDOM() * 15,
    FLOOR(100 + RANDOM() * 200),
    FLOOR(20 + RANDOM() * 30),
    FLOOR(3 + RANDOM() * 2),
    CASE WHEN RANDOM() > 0.5 THEN 'Good practice session, struggled with F chord transition' ELSE 'Focused on chord changes' END
FROM users u, songs s
WHERE u.email IN ('john@example.com', 'sarah@example.com')
AND s.title IN ('Wonderwall', 'Let It Be')
LIMIT 5;

-- Sample user_songs (saved songs)
INSERT INTO user_songs (user_id, song_id, practice_count)
SELECT u.user_id, s.song_id, FLOOR(1 + RANDOM() * 10)
FROM users u, songs s
WHERE u.email IN ('john@example.com', 'sarah@example.com', 'mike@example.com')
AND s.title IN ('Wonderwall', 'Let It Be', 'Sweet Child O'' Mine', 'Stairway to Heaven', 'Hotel California');

-- Update popularity scores based on sample data
UPDATE songs SET popularity_score = (
    (SELECT COUNT(*) FROM user_songs WHERE song_id = songs.song_id) * 0.3 +
    (SELECT COUNT(*) FROM practice_sessions WHERE song_id = songs.song_id) * 0.5 +
    RANDOM() * 2.0
) WHERE processing_status = 'completed';