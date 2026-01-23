const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const userService = require('../services/userService');
const practiceService = require('../services/practiceService');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

// Register new user
router.post('/register',
  validationMiddleware.validateUserRegistration,
  async (req, res) => {
    try {
      const { email, username, password, display_name } = req.body;

      // Check if user already exists
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Email already registered',
          code: 'EMAIL_EXISTS'
        });
      }

      const existingUsername = await userService.getUserByUsername(username);
      if (existingUsername) {
        return res.status(409).json({
          error: 'Username already taken',
          code: 'USERNAME_EXISTS'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const userData = {
        email,
        username,
        hashed_password: hashedPassword,
        display_name: display_name || username
      };

      const user = await userService.createUser(userData);

      // Generate tokens
      const tokens = authMiddleware.generateTokens({
        id: user.user_id,
        email: user.email,
        username: user.username
      });

      // Update login info
      await userService.updateLoginInfo(
        user.user_id,
        req.ip,
        req.get('User-Agent') || 'Unknown'
      );

      logger.info(`User registered: ${email}`);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          skill_level: user.skill_level
        },
        tokens
      });
    } catch (error) {
      logger.error('User registration failed', { error: error.message, email: req.body.email });
      res.status(500).json({
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR',
        message: error.message
      });
    }
  }
);

// Login user
router.post('/login',
  validationMiddleware.validateUserLogin,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Get user by email
      const user = await userService.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.hashed_password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Generate tokens
      const tokens = authMiddleware.generateTokens({
        id: user.user_id,
        email: user.email,
        username: user.username
      });

      // Update login info
      await userService.updateLoginInfo(
        user.user_id,
        req.ip,
        req.get('User-Agent') || 'Unknown'
      );

      logger.info(`User logged in: ${email}`);

      res.json({
        message: 'Login successful',
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          skill_level: user.skill_level
        },
        tokens
      });
    } catch (error) {
      logger.error('User login failed', { error: error.message, email: req.body.email });
      res.status(500).json({
        error: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  }
);

// Guest login
router.post('/guest',
  [
    body('deviceId').notEmpty().withMessage('Device ID is required')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const { deviceId } = req.body;

      // Check if guest user already exists for this device
      let user = await userService.getUserByDeviceId(deviceId);

      if (!user) {
        user = await userService.createGuestUser(deviceId);
      }

      // Generate tokens
      const tokens = authMiddleware.generateTokens({
        id: user.user_id,
        username: user.username,
        isGuest: true
      });

      // Update login info
      await userService.updateLoginInfo(
        user.user_id,
        req.ip,
        req.get('User-Agent') || 'Unknown'
      );

      logger.info(`Guest user logged in: ${user.username}`);

      res.json({
        message: 'Guest login successful',
        user: {
          id: user.user_id,
          username: user.username,
          display_name: user.display_name,
          skill_level: user.skill_level
        },
        tokens
      });
    } catch (error) {
      logger.error('Guest login failed', { error: error.message, deviceId: req.body.deviceId });
      res.status(500).json({
        error: 'Guest login failed',
        code: 'GUEST_LOGIN_ERROR'
      });
    }
  }
);

// Refresh token
router.post('/refresh',
  validationMiddleware.validateRefreshToken,
  authMiddleware.refreshToken(),
  async (req, res) => {
    try {
      const { user } = req;

      // Get fresh user data
      const userData = await userService.getUserById(user.id);
      if (!userData) {
        return res.status(401).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Generate new tokens
      const tokens = authMiddleware.generateTokens({
        id: userData.user_id,
        email: userData.email,
        username: userData.username
      });

      res.json({
        message: 'Token refreshed successfully',
        tokens
      });
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      res.status(500).json({
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR'
      });
    }
  }
);

// Logout
router.post('/logout',
  authMiddleware.authenticate(),
  authMiddleware.logout(),
  async (req, res) => {
    res.json({
      message: 'Logout successful'
    });
  }
);

// Get current user profile
router.get('/profile',
  authMiddleware.authenticate(),
  async (req, res) => {
    try {
      const user = await userService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          skill_level: user.skill_level,
          preferred_genres: user.preferred_genres,
          practice_goal: user.practice_goal,
          daily_reminder_time: user.daily_reminder_time,
          timezone: user.timezone,
          subscription_tier: user.subscription_tier,
          created_at: user.created_at,
          last_login_at: user.last_login_at
        }
      });
    } catch (error) {
      logger.error('Failed to get user profile', { userId: req.user.id, error: error.message });
      res.status(500).json({
        error: 'Failed to get profile',
        code: 'PROFILE_ERROR'
      });
    }
  }
);

// Update user profile
router.put('/profile',
  authMiddleware.authenticate(),
  [
    body('display_name')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Display name must be less than 50 characters'),
    
    body('username')
      .optional()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
    
    body('skill_level')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Skill level must be between 1 and 10'),
    
    body('preferred_genres')
      .optional()
      .isArray()
      .withMessage('Preferred genres must be an array'),
    
    body('practice_goal')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Practice goal must be less than 100 characters'),
    
    body('daily_reminder_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time must be in HH:MM format'),
    
    body('timezone')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Timezone must be less than 50 characters'),
    
    body('preferred_tuning')
      .optional()
      .isArray()
      .withMessage('Preferred tuning must be an array of strings')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const updateData = {};
      const allowedFields = ['display_name', 'username', 'skill_level', 'preferred_genres', 
                          'practice_goal', 'daily_reminder_time', 'timezone', 'preferred_tuning'];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'No valid fields to update',
          code: 'NO_UPDATE_FIELDS'
        });
      }

      const updatedUser = await userService.updateUser(req.user.id, updateData);

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.user_id,
          email: updatedUser.email,
          username: updatedUser.username,
          display_name: updatedUser.display_name,
          skill_level: updatedUser.skill_level,
          preferred_genres: updatedUser.preferred_genres,
          practice_goal: updatedUser.practice_goal,
          daily_reminder_time: updatedUser.daily_reminder_time,
          timezone: updatedUser.timezone,
          updated_at: updatedUser.updated_at
        }
      });
    } catch (error) {
      logger.error('Failed to update user profile', { userId: req.user.id, error: error.message });
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: error.message,
          code: 'DUPLICATE_FIELD'
        });
      }
      
      res.status(500).json({
        error: 'Failed to update profile',
        code: 'PROFILE_UPDATE_ERROR'
      });
    }
  }
);

// Change password
router.put('/password',
  authMiddleware.authenticate(),
  [
    body('current_password')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('new_password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      // Get user with password
      const user = await userService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(current_password, user.hashed_password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(new_password, 12);

      // Update password
      await userService.updatePassword(req.user.id, hashedNewPassword);

      logger.info(`Password changed for user: ${req.user.id}`);

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Failed to change password', { userId: req.user.id, error: error.message });
      res.status(500).json({
        error: 'Failed to change password',
        code: 'PASSWORD_CHANGE_ERROR'
      });
    }
  }
);

// Get user progress and statistics
router.get('/progress',
  authMiddleware.authenticate(),
  async (req, res) => {
    try {
      const progress = await userService.getUserProgress(req.user.id);
      const practiceStats = await practiceService.getUserPracticeStats(req.user.id);
      const skillProgression = await practiceService.getUserSkillProgression(req.user.id, '90d');
      const techniqueMastery = await practiceService.getTechniqueMastery(req.user.id);

      res.json({
        progress,
        practice_stats: practiceStats,
        skill_progression: skillProgression,
        technique_mastery: techniqueMastery
      });
    } catch (error) {
      logger.error('Failed to get user progress', { userId: req.user.id, error: error.message });
      res.status(500).json({
        error: 'Failed to get progress',
        code: 'PROGRESS_ERROR'
      });
    }
  }
);

// Get practice recommendations
router.get('/recommendations',
  authMiddleware.authenticate(),
  async (req, res) => {
    try {
      const recommendations = await practiceService.getPracticeRecommendations(req.user.id);

      res.json({
        recommendations
      });
    } catch (error) {
      logger.error('Failed to get recommendations', { userId: req.user.id, error: error.message });
      res.status(500).json({
        error: 'Failed to get recommendations',
        code: 'RECOMMENDATIONS_ERROR'
      });
    }
  }
);

module.exports = router;