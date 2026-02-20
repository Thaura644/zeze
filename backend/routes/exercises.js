const express = require('express');
const router = express.Router();
const audioGenerationService = require('../services/audioGenerationService');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { query: dbQuery } = require('../config/database');

// Generate a new guitar exercise
router.post('/generate-exercise', auth.authenticate(), async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Manual validation since express-validator array is causing issues
  const { skillLevel, style, tempo, duration, key, exerciseType } = req.body;
  
  if (!['beginner', 'intermediate', 'advanced'].includes(skillLevel)) {
    return res.status(400).json({ error: 'Invalid skill level' });
  }
  if (!['rock', 'blues', 'jazz', 'folk', 'classical'].includes(style)) {
    return res.status(400).json({ error: 'Invalid style' });
  }
  if (!Number.isInteger(tempo) || tempo < 40 || tempo > 200) {
    return res.status(400).json({ error: 'Tempo must be between 40 and 200' });
  }
  if (!Number.isInteger(duration) || duration < 10 || duration > 120) {
    return res.status(400).json({ error: 'Duration must be between 10 and 120 seconds' });
  }
  if (!['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].includes(key)) {
    return res.status(400).json({ error: 'Invalid key' });
  }
  if (!['melody', 'chord', 'scale', 'riff'].includes(exerciseType)) {
    return res.status(400).json({ error: 'Invalid exercise type' });
  }
  try {
    const exercise = await audioGenerationService.generateGuitarExercise(req.body);
    
    // Persist to database
    try {
      await dbQuery(
        `INSERT INTO exercises (exercise_id, user_id, type, skill_level, style, tempo, duration, key, audio_path, tablature, instructions, variations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          exercise.exerciseId,
          req.user.id,
          exercise.type,
          exercise.skillLevel,
          exercise.style,
          exercise.tempo,
          exercise.duration,
          exercise.key,
          exercise.audioPath,
          JSON.stringify(exercise.tablature),
          JSON.stringify(exercise.instructions),
          JSON.stringify(exercise.variations)
        ]
      );
    } catch (dbError) {
      logger.error('Failed to persist generated exercise:', dbError);
    }

    res.json({
      success: true,
      exercise: {
        id: exercise.exerciseId,
        type: exercise.type,
        skillLevel: exercise.skillLevel,
        style: exercise.style,
        tempo: exercise.tempo,
        duration: exercise.duration,
        key: exercise.key,
        audioUrl: `/api/exercises/audio/${exercise.exerciseId}`,
        tablature: exercise.tablature,
        instructions: exercise.instructions,
        variations: exercise.variations,
        generatedAt: exercise.generatedAt,
        fallback: exercise.fallback || false
      }
    });
  } catch (error) {
    console.error('Exercise generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate exercise'
    });
  }
});

// Serve generated exercise audio files
router.get('/audio/:exerciseId', async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const audioPath = `/tmp/exercises/${exerciseId}.wav`;
    
    res.sendFile(audioPath, { root: process.cwd() }, (err) => {
      if (err) {
        console.error('Error serving audio file:', err);
        res.status(404).json({ error: 'Audio file not found' });
      }
    });
  } catch (error) {
    console.error('Audio serving error:', error);
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

// Get exercise with speed control
router.get('/audio/:exerciseId/:speed', async (req, res) => {
  try {
    const { exerciseId, speed } = req.params;
    const speedRatio = parseFloat(speed);
    
    if (isNaN(speedRatio) || speedRatio < 0.25 || speedRatio > 2.0) {
      return res.status(400).json({ error: 'Invalid speed. Must be between 0.25 and 2.0' });
    }
    
    const originalPath = `/tmp/exercises/${exerciseId}.wav`;
    const processed = await audioGenerationService.processWithSpeedControl(originalPath, speedRatio);
    
    res.sendFile(processed.processedPath, { root: process.cwd() }, (err) => {
      if (err) {
        console.error('Error serving processed audio file:', err);
        res.status(404).json({ error: 'Audio file not found' });
      }
    });
  } catch (error) {
    console.error('Speed processing error:', error);
    res.status(500).json({ error: 'Failed to process audio speed' });
  }
});

// Generate exercise variation
router.post('/generate-variation/:exerciseId', auth.authenticate(), async (req, res) => {
  try {
    // Manual validation
    const { variationType, value } = req.body;
    
    if (!['tempo', 'key', 'style', 'complexity'].includes(variationType)) {
      return res.status(400).json({ error: 'Invalid variation type' });
    }
    if (!value) {
      return res.status(400).json({ error: 'Variation value is required' });
    }

    const { exerciseId } = req.params;
    
    // Retrieve the original exercise from the database
    const originalExercise = await getExerciseById(exerciseId);
    if (!originalExercise) {
      return res.status(404).json({ error: 'Original exercise not found' });
    }
    
    // Generate variation based on the original exercise and variation parameters
    const variation = await generateExerciseVariation(originalExercise, variationType, value);
    
    res.json({
      success: true,
      variation: {
        id: variation.exerciseId,
        type: variationType,
        originalId: exerciseId,
        audioUrl: `/api/exercises/audio/${variation.exerciseId}`,
        tablature: variation.tablature,
        instructions: variation.instructions,
        generatedAt: variation.generatedAt
      }
    });
  } catch (error) {
    logger.error('Variation generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate variation'
    });
  }
});

// Helper function to retrieve exercise by ID
async function getExerciseById(exerciseId) {
  try {
    const result = await dbQuery('SELECT * FROM exercises WHERE exercise_id = $1', [exerciseId]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        exerciseId: row.exercise_id,
        skillLevel: row.skill_level,
        style: row.style,
        tempo: row.tempo,
        duration: row.duration,
        key: row.key,
        exerciseType: row.type,
        tablature: row.tablature,
        instructions: row.instructions,
        variations: row.variations
      };
    }
    return null;
  } catch (error) {
    logger.error('Error fetching exercise by ID:', error);
    return null;
  }
}

// Helper function to generate exercise variations algorithmically
async function generateExerciseVariation(originalExercise, variationType, value) {
  // Create a copy of the original exercise
  const variationOptions = { ...originalExercise };
  
  // Apply the variation based on type
  switch (variationType) {
    case 'tempo':
      variationOptions.tempo = parseInt(value);
      variationOptions.duration = Math.max(10, Math.min(120, originalExercise.duration * (120 / variationOptions.tempo)));
      break;
    case 'key':
      variationOptions.key = value;
      // Adjust tempo slightly for key changes to maintain musical feel
      variationOptions.tempo = Math.max(40, Math.min(200, originalExercise.tempo * 0.95));
      break;
    case 'style':
      variationOptions.style = value;
      // Different styles may have different typical tempos
      const styleTempos = {
        'rock': 120,
        'blues': 100,
        'jazz': 140,
        'folk': 90,
        'classical': 110
      };
      variationOptions.tempo = styleTempos[value] || originalExercise.tempo;
      break;
    case 'complexity':
      // Adjust skill level based on complexity value
      const complexityMap = {
        'easy': 'beginner',
        'medium': 'intermediate',
        'hard': 'advanced'
      };
      variationOptions.skillLevel = complexityMap[value] || originalExercise.skillLevel;
      break;
  }
  
  // Ensure musical coherence by validating the variation
  validateMusicalCoherence(variationOptions);
  
  // Generate the variation using the audio generation service
  const variation = await audioGenerationService.generateGuitarExercise(variationOptions);
  
  return variation;
}

// Helper function to validate musical coherence
function validateMusicalCoherence(options) {
  // Validate tempo is within reasonable range for the style
  const styleTempoRanges = {
    'rock': { min: 80, max: 180 },
    'blues': { min: 60, max: 140 },
    'jazz': { min: 100, max: 200 },
    'folk': { min: 60, max: 120 },
    'classical': { min: 60, max: 160 }
  };
  
  const range = styleTempoRanges[options.style] || { min: 40, max: 200 };
  options.tempo = Math.max(range.min, Math.min(range.max, options.tempo));
  
  // Validate key is compatible with the style
  const styleKeys = {
    'blues': ['A', 'E', 'B', 'C', 'G'],
    'rock': ['E', 'A', 'D', 'G', 'C'],
    'jazz': ['C', 'F', 'Bb', 'Eb', 'G'],
    'folk': ['G', 'C', 'D', 'A', 'E'],
    'classical': ['C', 'G', 'D', 'A', 'E']
  };
  
  // If the key is not in the preferred keys for the style, adjust to a compatible key
  if (styleKeys[options.style] && !styleKeys[options.style].includes(options.key)) {
    options.key = styleKeys[options.style][0]; // Use the first preferred key
  }
  
  // Ensure duration is appropriate for the exercise type and skill level
  const durationConstraints = {
    'beginner': { min: 15, max: 60 },
    'intermediate': { min: 20, max: 90 },
    'advanced': { min: 30, max: 120 }
  };
  
  const constraints = durationConstraints[options.skillLevel] || { min: 10, max: 120 };
  options.duration = Math.max(constraints.min, Math.min(constraints.max, options.duration));
  
  logger.info(`Validated musical coherence for exercise: ${JSON.stringify(options)}`);
}

// Get exercise library (pre-defined exercises)
router.get('/library', auth.authenticate(), async (req, res) => {
  try {
    const { skillLevel, style } = req.query;
    
    // Pre-defined exercise library
    const library = [
      {
        id: 'basic-em-scale',
        name: 'Basic E Minor Scale',
        skillLevel: 'beginner',
        style: 'rock',
        tempo: 80,
        duration: 30,
        key: 'E',
        exerciseType: 'scale',
        description: 'Learn the fundamental E minor scale pattern',
        difficulty: 1
      },
      {
        id: 'blues-chord-progression',
        name: '12-Bar Blues in A',
        skillLevel: 'intermediate',
        style: 'blues',
        tempo: 100,
        duration: 48,
        key: 'A',
        exerciseType: 'chord',
        description: 'Classic 12-bar blues chord progression',
        difficulty: 3
      },
      {
        id: 'rock-guitar-riff',
        name: 'Classic Rock Riff',
        skillLevel: 'intermediate',
        style: 'rock',
        tempo: 120,
        duration: 16,
        key: 'E',
        exerciseType: 'riff',
        description: 'Powerful rock guitar riff with palm muting',
        difficulty: 4
      },
      {
        id: 'jazz-melody',
        name: 'Jazz Melody Exercise',
        skillLevel: 'advanced',
        style: 'jazz',
        tempo: 140,
        duration: 32,
        key: 'C',
        exerciseType: 'melody',
        description: 'Complex jazz melody with chord changes',
        difficulty: 5
      }
    ];
    
    let filteredLibrary = library;
    
    if (skillLevel) {
      filteredLibrary = filteredLibrary.filter(ex => ex.skillLevel === skillLevel);
    }
    
    if (style) {
      filteredLibrary = filteredLibrary.filter(ex => ex.style === style);
    }
    
    res.json({
      success: true,
      exercises: filteredLibrary
    });
  } catch (error) {
    console.error('Library retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve exercise library'
    });
  }
});

// Load a predefined exercise
router.post('/load/:exerciseId', auth.authenticate(), async (req, res) => {
  try {
    const { exerciseId } = req.params;
    
    // predefined exercise definitions
    const predefinedExercises = {
      'basic-em-scale': {
        skillLevel: 'beginner',
        style: 'rock',
        tempo: 80,
        duration: 30,
        key: 'E',
        exerciseType: 'scale'
      },
      'blues-chord-progression': {
        skillLevel: 'intermediate',
        style: 'blues',
        tempo: 100,
        duration: 48,
        key: 'A',
        exerciseType: 'chord'
      },
      'rock-guitar-riff': {
        skillLevel: 'intermediate',
        style: 'rock',
        tempo: 120,
        duration: 16,
        key: 'E',
        exerciseType: 'riff'
      },
      'jazz-melody': {
        skillLevel: 'advanced',
        style: 'jazz',
        tempo: 140,
        duration: 32,
        key: 'C',
        exerciseType: 'melody'
      }
    };
    
    const exerciseConfig = predefinedExercises[exerciseId];
    
    if (!exerciseConfig) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    const exercise = await audioGenerationService.generateGuitarExercise(exerciseConfig);
    
    // Persist to database
    try {
      await dbQuery(
        `INSERT INTO exercises (exercise_id, user_id, type, skill_level, style, tempo, duration, key, audio_path, tablature, instructions, variations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          exercise.exerciseId,
          req.user.id,
          exercise.type,
          exercise.skillLevel,
          exercise.style,
          exercise.tempo,
          exercise.duration,
          exercise.key,
          exercise.audioPath,
          JSON.stringify(exercise.tablature),
          JSON.stringify(exercise.instructions),
          JSON.stringify(exercise.variations)
        ]
      );
    } catch (dbError) {
      logger.error('Failed to persist loaded exercise:', dbError);
    }

    res.json({
      success: true,
      exercise: {
        id: exercise.exerciseId,
        templateId: exerciseId,
        type: exercise.type,
        skillLevel: exercise.skillLevel,
        style: exercise.style,
        tempo: exercise.tempo,
        duration: exercise.duration,
        key: exercise.key,
        audioUrl: `/api/exercises/audio/${exercise.exerciseId}`,
        tablature: exercise.tablature,
        instructions: exercise.instructions,
        variations: exercise.variations,
        generatedAt: exercise.generatedAt
      }
    });
  } catch (error) {
    console.error('Exercise loading error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load exercise'
    });
  }
});

module.exports = router;