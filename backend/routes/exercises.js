const express = require('express');
const router = express.Router();
const audioGenerationService = require('../services/audioGenerationService');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Generate a new guitar exercise
router.post('/generate-exercise', auth, [
  body('skillLevel').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid skill level'),
  body('style').isIn(['rock', 'blues', 'jazz', 'folk', 'classical']).withMessage('Invalid style'),
  body('tempo').isInt({ min: 40, max: 200 }).withMessage('Tempo must be between 40 and 200'),
  body('duration').isInt({ min: 10, max: 120 }).withMessage('Duration must be between 10 and 120 seconds'),
  body('key').isIn(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']).withMessage('Invalid key'),
  body('exerciseType').isIn(['melody', 'chord', 'scale', 'riff']).withMessage('Invalid exercise type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const exercise = await audioGenerationService.generateGuitarExercise(req.body);
    
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
router.post('/generate-variation/:exerciseId', auth, [
  body('variationType').isIn(['tempo', 'key', 'style', 'complexity']).withMessage('Invalid variation type'),
  body('value').notEmpty().withMessage('Variation value is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { exerciseId } = req.params;
    const { variationType, value } = req.body;
    
    // This would retrieve the original exercise and create a variation
    // For now, we'll simulate this
    const variation = await audioGenerationService.generateGuitarExercise({
      skillLevel: 'intermediate',
      style: 'rock',
      tempo: variationType === 'tempo' ? value : 120,
      duration: 30,
      key: variationType === 'key' ? value : 'C',
      exerciseType: 'melody'
    });
    
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
    console.error('Variation generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate variation'
    });
  }
});

// Get exercise library (pre-defined exercises)
router.get('/library', auth, async (req, res) => {
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
router.post('/load/:exerciseId', auth, async (req, res) => {
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