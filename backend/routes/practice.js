const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const practiceService = require('../services/practiceService');
const songService = require('../services/songService');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const logger = require('../config/logger');

// Start practice session
router.post('/start',
  authMiddleware.authenticate(),
  validationMiddleware.validatePracticeStart,
  async (req, res) => {
    try {
      const sessionData = {
        ...req.body,
        user_id: req.user.id,
        device_type: req.get('User-Agent') || 'Unknown',
        app_version: req.get('App-Version') || '1.0.0'
      };

      const session = await practiceService.startPracticeSession(sessionData);

      res.status(201).json({
        message: 'Practice session started',
        session_id: session.session_id,
        start_time: session.start_time,
        practice_settings: {
          metronome_enabled: true,
          loop_section: { start: 0.0, end: 30.0 },
          difficulty_adjustments: {
            simplify_chords: false,
            slow_tempo: sessionData.tempo_percentage < 100
          }
        }
      });
    } catch (error) {
      logger.error('Failed to start practice session', { 
        userId: req.user.id, 
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to start practice session',
        code: 'SESSION_START_ERROR',
        message: error.message
      });
    }
  }
);

// End practice session
router.post('/end/:sessionId',
  authMiddleware.authenticate(),
  [
    param('sessionId')
      .isUUID()
      .withMessage('Valid session ID is required'),
    
    body('duration_seconds')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Duration must be a positive integer'),
    
    body('overall_accuracy')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Overall accuracy must be between 0 and 100'),
    
    body('timing_accuracy')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Timing accuracy must be between 0 and 100'),
    
    body('pitch_accuracy')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Pitch accuracy must be between 0 and 100'),
    
    body('rhythm_accuracy')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Rhythm accuracy must be between 0 and 100'),
    
    body('notes_played')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Notes played must be a positive integer'),
    
    body('chords_played')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Chords played must be a positive integer'),
    
    body('user_rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('User rating must be between 1 and 5'),
    
    body('user_feedback')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('User feedback must be less than 1000 characters')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const endData = req.body;

      // Verify session belongs to user
      const existingSession = await practiceService.getPracticeSession(sessionId, req.user.id);
      if (!existingSession) {
        return res.status(404).json({
          error: 'Practice session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      if (existingSession.end_time) {
        return res.status(400).json({
          error: 'Practice session already ended',
          code: 'SESSION_ALREADY_ENDED'
        });
      }

      // End the session
      const session = await practiceService.endPracticeSession(sessionId, endData);

      // Update song popularity if this was a song practice
      if (existingSession.song_id) {
        await songService.updatePopularityScore(existingSession.song_id);
      }

      res.json({
        message: 'Practice session ended',
        session: {
          session_id: session.session_id,
          duration_seconds: session.duration_seconds,
          overall_accuracy: session.overall_accuracy,
          timing_accuracy: session.timing_accuracy,
          pitch_accuracy: session.pitch_accuracy,
          rhythm_accuracy: session.rhythm_accuracy,
          end_time: session.end_time
        }
      });
    } catch (error) {
      logger.error('Failed to end practice session', { 
        sessionId: req.params.sessionId,
        userId: req.user.id, 
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to end practice session',
        code: 'SESSION_END_ERROR',
        message: error.message
      });
    }
  }
);

// Submit practice analysis (real-time feedback)
router.post('/analyze',
  authMiddleware.authenticate(),
  validationMiddleware.validatePracticeAnalysis,
  async (req, res) => {
    try {
      const { session_id, audio_file, practice_notes } = req.body;

      // Verify session belongs to user and is active
      const session = await practiceService.getPracticeSession(session_id, req.user.id);
      if (!session) {
        return res.status(404).json({
          error: 'Practice session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      if (session.end_time) {
        return res.status(400).json({
          error: 'Practice session has already ended',
          code: 'SESSION_ENDED'
        });
      }

      // Mock analysis results (would integrate with AI/ML models)
      const analysisResults = {
        overall_accuracy: Math.random() * 40 + 60, // 60-100%
        timing_accuracy: Math.random() * 30 + 70,   // 70-100%
        pitch_accuracy: Math.random() * 35 + 65,    // 65-100%
        rhythm_accuracy: Math.random() * 25 + 75,   // 75-100%
        chord_accuracy: {
          'C': { accuracy: Math.random() * 20 + 80, mistakes: Math.floor(Math.random() * 5) },
          'G': { accuracy: Math.random() * 25 + 75, mistakes: Math.floor(Math.random() * 4) },
          'D': { accuracy: Math.random() * 30 + 70, mistakes: Math.floor(Math.random() * 6) },
          'Em': { accuracy: Math.random() * 15 + 85, mistakes: Math.floor(Math.random() * 3) }
        },
        mistakes: [
          {
            timestamp: Math.random() * 30,
            type: ['pitch', 'timing', 'chord'][Math.floor(Math.random() * 3)],
            severity: ['minor', 'major'][Math.floor(Math.random() * 2)],
            description: ['Slightly sharp on G string', 'Late beat by 200ms', 'Chord buzz detected'][Math.floor(Math.random() * 3)]
          }
        ],
        improvement_areas: [
          'F chord finger positioning',
          'Chord transition timing',
          'Strumming pattern consistency'
        ],
        next_practice_suggestions: {
          focus_techniques: ['barre_chords', 'chord_transitions'],
          recommended_tempo: 60,
          practice_exercises: ['f-chord-drill', 'g-f-transition']
        }
      };

      // Store analysis data
      await practiceService.addPracticeAnalysis(session_id, {
        timestamp: new Date().toISOString(),
        current_chord: 'G', // Would be determined from actual analysis
        accuracy: analysisResults.overall_accuracy,
        mistake_detected: analysisResults.mistakes[0],
        encouragement: 'Great timing! Keep your wrist relaxed.',
        practice_notes: practice_notes
      });

      res.json({
        analysis_results: analysisResults
      });
    } catch (error) {
      logger.error('Failed to analyze practice', { 
        sessionId: req.body.session_id,
        userId: req.user.id, 
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to analyze practice',
        code: 'ANALYSIS_ERROR',
        message: error.message
      });
    }
  }
);

// Get user's practice sessions
router.get('/sessions',
  authMiddleware.authenticate(),
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    
    query('session_type')
      .optional()
      .isIn(['song_practice', 'technique_drill', 'free_play'])
      .withMessage('Invalid session type'),
    
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const options = {
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        session_type: req.query.session_type,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const sessions = await practiceService.getUserPracticeSessions(req.user.id, options);

      res.json({
        sessions,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: sessions.length // Would need separate count query for actual total
        }
      });
    } catch (error) {
      logger.error('Failed to get practice sessions', { 
        userId: req.user.id, 
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to get practice sessions',
        code: 'SESSIONS_ERROR'
      });
    }
  }
);

// Get specific practice session
router.get('/sessions/:sessionId',
  authMiddleware.authenticate(),
  [
    param('sessionId')
      .isUUID()
      .withMessage('Valid session ID is required')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const session = await practiceService.getPracticeSession(sessionId, req.user.id);
      if (!session) {
        return res.status(404).json({
          error: 'Practice session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      // Get practice analysis for this session
      const analysis = await practiceService.getPracticeAnalysis(sessionId);

      res.json({
        session,
        analysis
      });
    } catch (error) {
      logger.error('Failed to get practice session', { 
        sessionId: req.params.sessionId,
        userId: req.user.id, 
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to get practice session',
        code: 'SESSION_ERROR'
      });
    }
  }
);

// Get practice statistics
router.get('/stats',
  authMiddleware.authenticate(),
  [
    query('timeFrame')
      .optional()
      .isIn(['7d', '30d', '90d', '1y'])
      .withMessage('Time frame must be 7d, 30d, 90d, or 1y')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const timeFrame = req.query.timeFrame || '30d';

      const [stats, skillProgression, techniqueMastery, recentMistakes] = await Promise.all([
        practiceService.getUserPracticeStats(req.user.id, timeFrame),
        practiceService.getUserSkillProgression(req.user.id, timeFrame),
        practiceService.getTechniqueMastery(req.user.id),
        practiceService.getRecentMistakes(req.user.id, 20)
      ]);

      res.json({
        stats,
        skill_progression: skillProgression,
        technique_mastery: techniqueMastery,
        recent_mistakes: recentMistakes,
        time_frame: timeFrame
      });
    } catch (error) {
      logger.error('Failed to get practice statistics', { 
        userId: req.user.id, 
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to get practice statistics',
        code: 'STATS_ERROR'
      });
    }
  }
);

module.exports = router;