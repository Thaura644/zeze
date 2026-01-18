const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const logger = require('../config/logger');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    logger.warn('Validation failed', { errors: errorMessages });
    
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errorMessages
    });
  }
  next();
};

// YouTube URL processing validation
const validateYouTubeProcessing = [
  body('youtube_url')
    .isURL()
    .withMessage('Valid YouTube URL is required')
    .matches(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)[a-zA-Z0-9_-]{11}/)
    .withMessage('Invalid YouTube URL format'),
  
  body('user_preferences.target_key')
    .optional()
    .isLength({ min: 1, max: 5 })
    .withMessage('Target key must be 1-5 characters'),
  
  body('user_preferences.difficulty_level')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Difficulty level must be between 1 and 10'),
  
  handleValidationErrors
];

// Job status validation - allow UUID or custom job ID formats
const validateJobStatus = [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid job ID format'),
  
  handleValidationErrors
];

// Song results validation - allow UUID or custom job ID formats
const validateSongResults = [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid job ID format'),
  
  handleValidationErrors
];

// Transposition validation
const validateTransposition = [
  body('song_id')
    .isUUID()
    .withMessage('Valid song ID is required'),
  
  body('target_key')
    .isLength({ min: 1, max: 5 })
    .withMessage('Target key must be 1-5 characters'),
  
  body('preserve_fingering')
    .optional()
    .isBoolean()
    .withMessage('Preserve fingering must be a boolean'),
  
  handleValidationErrors
];

// Technique guidance validation
const validateTechniqueGuidance = [
  param('songId')
    .isUUID()
    .withMessage('Valid song ID is required'),
  
  param('timestamp')
    .isFloat({ min: 0 })
    .withMessage('Timestamp must be a positive number'),
  
  handleValidationErrors
];

// Practice session start validation
const validatePracticeStart = [
  body('song_id')
    .isUUID()
    .withMessage('Valid song ID is required'),
  
  body('session_type')
    .isIn(['song_practice', 'technique_drill', 'free_play'])
    .withMessage('Invalid session type'),
  
  body('focus_techniques')
    .optional()
    .isArray()
    .withMessage('Focus techniques must be an array'),
  
  body('tempo_percentage')
    .optional()
    .isInt({ min: 25, max: 200 })
    .withMessage('Tempo percentage must be between 25 and 200'),
  
  body('transposition_key')
    .optional()
    .isLength({ min: 1, max: 5 })
    .withMessage('Transposition key must be 1-5 characters'),
  
  handleValidationErrors
];

// Practice analysis validation
const validatePracticeAnalysis = [
  body('session_id')
    .isUUID()
    .withMessage('Valid session ID is required'),
  
  body('practice_notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Practice notes must be less than 1000 characters'),
  
  handleValidationErrors
];

// User registration validation
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('display_name')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Display name must be less than 50 characters'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Refresh token validation
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  
  handleValidationErrors
];

module.exports = {
  router,
  handleValidationErrors,
  validateYouTubeProcessing,
  validateJobStatus,
  validateSongResults,
  validateTransposition,
  validateTechniqueGuidance,
  validatePracticeStart,
  validatePracticeAnalysis,
  validateUserRegistration,
  validateUserLogin,
  validateRefreshToken
};