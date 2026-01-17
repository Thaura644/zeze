-- Migration: Add sample data for testing
-- This migration inserts initial sample techniques and chords

-- Insert sample techniques
INSERT INTO techniques (
  technique_id, name, slug, category, difficulty_level, description,
  instructions, common_mistakes, tips
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Open Chords',
  'open-chords',
  'chords',
  1,
  'Master common open-position chords and smooth transitions.',
  '["Place fingers on frets as shown", "Strum from low to high strings", "Practice transitions slowly"]'::jsonb,
  '["Not pressing strings firmly enough", "Moving fingers too high off fretboard"]'::text[],
  '["Start with basic C, G, D, Em, Am chords", "Use a metronome for timing", "Practice transitions at slow tempo first"]'::text[]
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

-- Insert sample chords
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