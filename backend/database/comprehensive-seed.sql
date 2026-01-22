-- ZEZE Guitar Learning App - Comprehensive Database Seed
-- This file populates the database with techniques, chords, exercises, and sample songs

-- ==================================================
-- 1. GUITAR TECHNIQUES
-- ==================================================

INSERT INTO techniques (name, category, difficulty, description, instructions, video_url, image_url, estimated_practice_time)
VALUES
  -- Beginner Techniques
  ('Alternate Picking', 'Picking', 1, 'Fundamental picking technique alternating down and up strokes',
   '1. Hold pick between thumb and index finger\n2. Start with downstroke\n3. Follow with upstroke\n4. Maintain consistent rhythm\n5. Practice slowly, gradually increase speed',
   'https://www.youtube.com/watch?v=example1', NULL, 300),

  ('Downstroke Picking', 'Picking', 1, 'Playing notes using only downward pick strokes',
   '1. Hold pick firmly\n2. Strike string moving downward\n3. Return pick to starting position\n4. Repeat with consistent motion',
   'https://www.youtube.com/watch?v=example2', NULL, 180),

  ('Upstroke Picking', 'Picking', 1, 'Playing notes using only upward pick strokes',
   '1. Position pick below string\n2. Strike string moving upward\n3. Maintain consistent angle\n4. Practice for evenness',
   'https://www.youtube.com/watch?v=example3', NULL, 180),

  ('Fingerpicking', 'Fingerstyle', 2, 'Plucking strings with individual fingers instead of a pick',
   '1. Assign thumb to bass strings (E, A, D)\n2. Index finger for G string\n3. Middle finger for B string\n4. Ring finger for high E\n5. Practice arpeggios slowly',
   'https://www.youtube.com/watch?v=example4', NULL, 600),

  ('Palm Muting', 'Muting', 1, 'Dampening strings with palm while picking',
   '1. Rest edge of palm on bridge\n2. Lightly touch strings near bridge\n3. Pick as normal\n4. Adjust pressure for desired mute',
   'https://www.youtube.com/watch?v=example5', NULL, 240),

  ('Power Chords', 'Chords', 1, 'Two or three-note chords using root and fifth',
   '1. Place index finger on root note\n2. Place ring finger two frets up, one string down\n3. Optionally add pinky one string down from ring finger\n4. Mute unused strings',
   'https://www.youtube.com/watch?v=example6', NULL, 300),

  -- Intermediate Techniques
  ('Hammer-Ons', 'Lead', 2, 'Sounding notes by hammering fingers onto frets',
   '1. Pick first note normally\n2. Without picking, forcefully press finger on higher fret\n3. Ensure note sounds clearly\n4. Practice with consistent strength',
   'https://www.youtube.com/watch?v=example7', NULL, 420),

  ('Pull-Offs', 'Lead', 2, 'Sounding notes by pulling fingers off frets',
   '1. Fret both notes simultaneously\n2. Pick higher note\n3. Pull finger off while slightly plucking string\n4. Lower note should sound clearly',
   'https://www.youtube.com/watch?v=example8', NULL, 420),

  ('String Bending', 'Lead', 3, 'Raising pitch by pushing or pulling string',
   '1. Fret note with ring finger\n2. Support with index and middle fingers\n3. Push string upward (or pull downward)\n4. Match target pitch\n5. Release smoothly',
   'https://www.youtube.com/watch?v=example9', NULL, 600),

  ('Vibrato', 'Expressive', 2, 'Adding slight pitch variation to sustained notes',
   '1. Fret note firmly\n2. Gently bend string up and down repeatedly\n3. Maintain consistent rhythm\n4. Control depth and speed',
   'https://www.youtube.com/watch?v=example10', NULL, 480),

  ('Slides', 'Lead', 2, 'Moving between notes by sliding along string',
   '1. Fret and pick starting note\n2. Maintain pressure while sliding to target fret\n3. Lift or pick again at destination\n4. Keep motion smooth',
   'https://www.youtube.com/watch?v=example11', NULL, 360),

  ('Barre Chords', 'Chords', 3, 'Using one finger to press multiple strings',
   '1. Lay index finger flat across all strings\n2. Position finger close to fret wire\n3. Apply firm pressure\n4. Form chord shape with other fingers\n5. Build finger strength gradually',
   'https://www.youtube.com/watch?v=example12', NULL, 900),

  ('Travis Picking', 'Fingerstyle', 3, 'Alternating bass fingerpicking pattern',
   '1. Thumb alternates between bass strings\n2. Fingers pluck treble strings\n3. Maintain steady rhythm\n4. Create independent bass line',
   'https://www.youtube.com/watch?v=example13', NULL, 720),

  -- Advanced Techniques
  ('Sweep Picking', 'Advanced', 5, 'Fluid picking motion across multiple strings',
   '1. Use single continuous pick motion\n2. One pick stroke per string\n3. Synchronize with fretting hand\n4. Mute strings after playing\n5. Start very slowly',
   'https://www.youtube.com/watch?v=example14', NULL, 1800),

  ('Tapping', 'Advanced', 4, 'Using both hands to hammer-on frets',
   '1. Use pick-hand finger to tap fret\n2. Pull off to fretted note\n3. Coordinate both hands\n4. Mute unwanted strings',
   'https://www.youtube.com/watch?v=example15', NULL, 1200),

  ('Legato', 'Lead', 4, 'Playing smoothly with minimal picking',
   '1. Pick first note only\n2. Use hammer-ons and pull-offs for following notes\n3. Maintain even volume\n4. Create flowing phrases',
   'https://www.youtube.com/watch?v=example16', NULL, 900),

  ('Economy Picking', 'Picking', 4, 'Efficient picking combining alternate and sweep',
   '1. Continue pick direction when crossing strings\n2. Reduce unnecessary pick motion\n3. Combine with alternate picking\n4. Practice string-crossing patterns',
   'https://www.youtube.com/watch?v=example17', NULL, 1200),

  ('Hybrid Picking', 'Picking', 3, 'Using pick and fingers simultaneously',
   '1. Hold pick with thumb and index\n2. Use middle and ring fingers to pluck\n3. Combine picked bass with fingerpicked melody\n4. Practice coordination',
   'https://www.youtube.com/watch?v=example18', NULL, 900),

  ('Pinch Harmonics', 'Advanced', 4, 'Creating harmonic overtones with picking technique',
   '1. Pick string while lightly touching with thumb\n2. Contact string immediately after pick strikes\n3. Experiment with hand position\n4. Add vibrato for sustain',
   'https://www.youtube.com/watch?v=example19', NULL, 1200),

  ('Natural Harmonics', 'Technique', 2, 'Creating bell-like tones at specific frets',
   '1. Lightly touch string directly over fret wire\n2. Don't press down\n3. Pick and immediately lift finger\n4. Common positions: 12th, 7th, 5th frets',
   'https://www.youtube.com/watch?v=example20', NULL, 360);

-- ==================================================
-- 2. CHORD LIBRARY
-- ==================================================

INSERT INTO chords (name, root_note, chord_type, frets, fingers, difficulty, alternate_positions, related_chords, common_progressions)
VALUES
  -- Major Chords
  ('C Major', 'C', 'Major', '{-1,3,2,0,1,0}', '{0,3,2,0,1,0}', 1,
   '[[8,10,10,9,8,8],[3,5,5,5,3,3]]', '["C","Am","F","G"]', '["I-IV-V","I-vi-IV-V"]'),

  ('D Major', 'D', 'Major', '{-1,-1,0,2,3,2}', '{0,0,0,1,3,2}', 1,
   '[[5,7,7,6,5,5],[10,12,12,11,10,10]]', '["D","Bm","G","A"]', '["I-IV-V","I-vi-IV-V"]'),

  ('E Major', 'E', 'Major', '{0,2,2,1,0,0}', '{0,2,3,1,0,0}', 1,
   '[[7,9,9,8,7,7],[12,14,14,13,12,12]]', '["E","C#m","A","B"]', '["I-IV-V","I-vi-IV-V"]'),

  ('F Major', 'F', 'Major', '{1,3,3,2,1,1}', '{1,3,4,2,1,1}', 3,
   '[[8,10,10,9,8,8]]', '["F","Dm","Bb","C"]', '["I-IV-V","I-vi-IV-V"]'),

  ('G Major', 'G', 'Major', '{3,2,0,0,0,3}', '{3,2,0,0,0,4}', 1,
   '[[10,12,12,11,10,10],[3,5,5,4,3,3]]', '["G","Em","C","D"]', '["I-IV-V","I-vi-IV-V"]'),

  ('A Major', 'A', 'Major', '{-1,0,2,2,2,0}', '{0,0,1,2,3,0}', 1,
   '[[5,7,7,6,5,5],[12,14,14,13,12,12]]', '["A","F#m","D","E"]', '["I-IV-V","I-vi-IV-V"]'),

  ('B Major', 'B', 'Major', '{-1,2,4,4,4,2}', '{0,1,3,3,3,1}', 3,
   '[[7,9,9,8,7,7]]', '["B","G#m","E","F#"]', '["I-IV-V","I-vi-IV-V"]'),

  -- Minor Chords
  ('A Minor', 'A', 'Minor', '{-1,0,2,2,1,0}', '{0,0,2,3,1,0}', 1,
   '[[5,7,7,5,5,5],[12,14,14,12,12,12]]', '["Am","C","Dm","G"]', '["i-iv-V","i-VI-III-VII"]'),

  ('D Minor', 'D', 'Minor', '{-1,-1,0,2,3,1}', '{0,0,0,2,3,1}', 1,
   '[[5,7,7,6,5,5],[10,12,12,10,10,10]]', '["Dm","F","Am","C"]', '["i-iv-V","i-VI-III-VII"]'),

  ('E Minor', 'E', 'Minor', '{0,2,2,0,0,0}', '{0,1,2,0,0,0}', 1,
   '[[7,9,9,7,7,7],[12,14,14,12,12,12]]', '["Em","G","Am","D"]', '["i-iv-V","i-VI-III-VII"]'),

  ('B Minor', 'B', 'Minor', '{-1,2,4,4,3,2}', '{0,1,3,4,2,1}', 3,
   '[[7,9,9,7,7,7]]', '["Bm","D","Em","A"]', '["i-iv-V","i-VI-III-VII"]'),

  -- Seventh Chords
  ('C7', 'C', 'Dominant 7th', '{-1,3,2,3,1,0}', '{0,3,2,4,1,0}', 2,
   '[[8,10,8,9,8,8]]', '["C7","F","G7","Am"]', '["I7-IV-V","I7-IV-I"]'),

  ('D7', 'D', 'Dominant 7th', '{-1,-1,0,2,1,2}', '{0,0,0,2,1,3}', 1,
   '[[5,7,5,6,5,5]]', '["D7","G","A7","Bm"]', '["I7-IV-V","I7-IV-I"]'),

  ('E7', 'E', 'Dominant 7th', '{0,2,0,1,0,0}', '{0,2,0,1,0,0}', 1,
   '[[7,9,7,8,7,7]]', '["E7","A","B7","C#m"]', '["I7-IV-V","I7-IV-I"]'),

  ('G7', 'G', 'Dominant 7th', '{3,2,0,0,0,1}', '{3,2,0,0,0,1}', 1,
   '[[10,12,10,11,10,10]]', '["G7","C","D7","Em"]', '["I7-IV-V","I7-IV-I"]'),

  ('A7', 'A', 'Dominant 7th', '{-1,0,2,0,2,0}', '{0,0,2,0,3,0}', 1,
   '[[5,7,5,6,5,5]]', '["A7","D","E7","F#m"]', '["I7-IV-V","I7-IV-I"]'),

  ('Cmaj7', 'C', 'Major 7th', '{-1,3,2,0,0,0}', '{0,3,2,0,0,0}', 2,
   '[[8,10,9,9,8,8]]', '["Cmaj7","Dm7","Em7","Fmaj7"]', '["Imaj7-IVmaj7-V7"]'),

  ('Dm7', 'D', 'Minor 7th', '{-1,-1,0,2,1,1}', '{0,0,0,2,1,1}', 2,
   '[[5,7,5,6,5,5]]', '["Dm7","G7","Cmaj7","Am7"]', '["iim7-V7-Imaj7"]'),

  ('Em7', 'E', 'Minor 7th', '{0,2,0,0,0,0}', '{0,2,0,0,0,0}', 1,
   '[[7,9,7,7,7,7]]', '["Em7","A7","Dmaj7","Bm7"]', '["iim7-V7-Imaj7"]'),

  ('Am7', 'A', 'Minor 7th', '{-1,0,2,0,1,0}', '{0,0,2,0,1,0}', 1,
   '[[5,7,5,5,5,5]]', '["Am7","Dm7","G7","Cmaj7"]', '["iim7-V7-Imaj7"]');

-- ==================================================
-- 3. SAMPLE SONGS
-- ==================================================

INSERT INTO songs (title, artist, duration, difficulty, tempo, key, time_signature, video_url, status, genre, chord_progression, structure)
VALUES
  ('Wonderwall', 'Oasis', 258, 2, 87, 'F# Minor', '4/4',
   'https://www.youtube.com/watch?v=bx1Bh8ZvH84', 'completed', 'Rock',
   '[{"chord":"Em7","start_time":0,"duration":4},{"chord":"G","start_time":4,"duration":4},{"chord":"Dsus4","start_time":8,"duration":4},{"chord":"A7sus4","start_time":12,"duration":4}]',
   '{"intro":{"start":0,"end":15},"verse":{"start":15,"end":45},"chorus":{"start":45,"end":75},"bridge":{"start":150,"end":180},"outro":{"start":230,"end":258}}'),

  ('Let It Be', 'The Beatles', 243, 1, 76, 'C Major', '4/4',
   'https://www.youtube.com/watch?v=QDYfEBY9NM4', 'completed', 'Pop',
   '[{"chord":"C","start_time":0,"duration":4},{"chord":"G","start_time":4,"duration":4},{"chord":"Am","start_time":8,"duration":4},{"chord":"F","start_time":12,"duration":4}]',
   '{"intro":{"start":0,"end":10},"verse":{"start":10,"end":50},"chorus":{"start":50,"end":90},"solo":{"start":140,"end":170},"outro":{"start":210,"end":243}}'),

  ('Sweet Child O Mine', 'Guns N Roses', 356, 4, 125, 'D Major', '4/4',
   'https://www.youtube.com/watch?v=1w7OgIMMRc4', 'completed', 'Rock',
   '[{"chord":"D","start_time":0,"duration":2},{"chord":"C","start_time":2,"duration":2},{"chord":"G","start_time":4,"duration":4}]',
   '{"intro":{"start":0,"end":30},"verse":{"start":30,"end":90},"chorus":{"start":90,"end":120},"solo":{"start":220,"end":280},"outro":{"start":320,"end":356}}'),

  ('Horse With No Name', 'America', 252, 1, 122, 'E Minor', '4/4',
   'https://www.youtube.com/watch?v=zSAJ0l4OBHM', 'completed', 'Folk',
   '[{"chord":"Em","start_time":0,"duration":8},{"chord":"D6/9","start_time":8,"duration":8}]',
   '{"intro":{"start":0,"end":8},"verse":{"start":8,"end":80},"chorus":{"start":80,"end":120},"verse":{"start":120,"end":200},"outro":{"start":220,"end":252}}'),

  ('Knockin on Heavens Door', 'Bob Dylan', 171, 1, 68, 'G Major', '4/4',
   'https://www.youtube.com/watch?v=vK-LDmKKF1M', 'completed', 'Folk',
   '[{"chord":"G","start_time":0,"duration":4},{"chord":"D","start_time":4,"duration":4},{"chord":"Am","start_time":8,"duration":8}]',
   '{"intro":{"start":0,"end":10},"verse":{"start":10,"end":60},"chorus":{"start":60,"end":100},"verse":{"start":100,"end":140},"outro":{"start":150,"end":171}}'),

  ('Stand By Me', 'Ben E. King', 179, 1, 118, 'A Major', '4/4',
   'https://www.youtube.com/watch?v=hwZNL7QVJjE', 'completed', 'Soul',
   '[{"chord":"A","start_time":0,"duration":4},{"chord":"F#m","start_time":4,"duration":4},{"chord":"D","start_time":8,"duration":4},{"chord":"E","start_time":12,"duration":4}]',
   '{"intro":{"start":0,"end":12},"verse":{"start":12,"end":50},"chorus":{"start":50,"end":80},"bridge":{"start":110,"end":140},"outro":{"start":160,"end":179}}'),

  ('Brown Eyed Girl', 'Van Morrison', 183, 2, 143, 'G Major', '4/4',
   'https://www.youtube.com/watch?v=UfmkgQRmmeE', 'completed', 'Rock',
   '[{"chord":"G","start_time":0,"duration":2},{"chord":"C","start_time":2,"duration":2},{"chord":"G","start_time":4,"duration":2},{"chord":"D","start_time":6,"duration":2}]',
   '{"intro":{"start":0,"end":5},"verse":{"start":5,"end":40},"chorus":{"start":40,"end":70},"verse":{"start":70,"end":110},"outro":{"start":160,"end":183}}'),

  ('Blackbird', 'The Beatles', 138, 3, 95, 'G Major', '3/4',
   'https://www.youtube.com/watch?v=Man4Xw8Xypo', 'completed', 'Folk',
   '[{"chord":"G","start_time":0,"duration":3},{"chord":"Am7","start_time":3,"duration":3},{"chord":"G","start_time":6,"duration":3}]',
   '{"intro":{"start":0,"end":10},"verse":{"start":10,"end":60},"bridge":{"start":60,"end":90},"verse":{"start":90,"end":130},"outro":{"start":130,"end":138}}');

-- ==================================================
-- 4. SONG-TECHNIQUE RELATIONSHIPS
-- ==================================================

INSERT INTO song_techniques (song_id, technique_id, difficulty, start_time, end_time, notes)
SELECT
  s.id, t.id, 1, 0, s.duration, 'Basic fingerpicking pattern throughout'
FROM songs s, techniques t
WHERE s.title = 'Blackbird' AND t.name = 'Fingerpicking';

INSERT INTO song_techniques (song_id, technique_id, difficulty, start_time, end_time, notes)
SELECT
  s.id, t.id, 2, 45, 75, 'Barre chord changes in chorus'
FROM songs s, techniques t
WHERE s.title = 'Wonderwall' AND t.name = 'Barre Chords';

INSERT INTO song_techniques (song_id, technique_id, difficulty, start_time, end_time, notes)
SELECT
  s.id, t.id, 3, 0, 30, 'Iconic intro riff using hammer-ons'
FROM songs s, techniques t
WHERE s.title = 'Sweet Child O Mine' AND t.name = 'Hammer-Ons';

INSERT INTO song_techniques (song_id, technique_id, difficulty, start_time, end_time, notes)
SELECT
  s.id, t.id, 1, 0, s.duration, 'Simple strumming pattern'
FROM songs s, techniques t
WHERE s.title IN ('Let It Be', 'Stand By Me', 'Knockin on Heavens Door')
AND t.name = 'Downstroke Picking';

-- ==================================================
-- 5. PRACTICE EXERCISES (Generated)
-- ==================================================

-- This will be populated by the backend exercise generation service
-- Sample structure:
-- INSERT INTO exercises (title, technique_id, difficulty, duration, instructions, audio_url)

-- ==================================================
-- 6. SYSTEM CONFIGURATION
-- ==================================================

INSERT INTO app_version (version, min_supported_version, release_notes, force_update)
VALUES ('1.0.0', '1.0.0', 'Initial release with core features', false);

-- ==================================================
-- 7. DEFAULT USER ROLES AND PERMISSIONS
-- ==================================================

-- Create sample users for testing (passwords are hashed 'testpassword123')
INSERT INTO users (email, password_hash, display_name, skill_level, subscription_tier, goals, preferred_genres)
VALUES
  ('demo@zeze.app', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQLoBUnnbEUEkLQpWnJCrcf6y',
   'Demo User', 1, 'free',
   '["Learn basic chords", "Play simple songs"]',
   '["Rock", "Pop", "Folk"]'),

  ('test@zeze.app', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQLoBUnnbEUEkLQpWnJCrcf6y',
   'Test User', 3, 'premium',
   '["Master advanced techniques", "Write original music"]',
   '["Rock", "Metal", "Blues"]');

COMMIT;
