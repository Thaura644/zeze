const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

/**
 * @route   POST /api/notifications/register
 * @desc    Register device for push notifications
 * @access  Private
 */
router.post('/register',
  authenticateToken,
  [
    body('pushToken').notEmpty().withMessage('Push token is required'),
    body('deviceInfo').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { pushToken, deviceInfo } = req.body;

      const result = await notificationService.registerDevice(
        req.user.id,
        pushToken,
        deviceInfo
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to register device', {
        userId: req.user.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to register device'
      });
    }
  }
);

/**
 * @route   POST /api/notifications/unregister
 * @desc    Unregister device from push notifications
 * @access  Private
 */
router.post('/unregister',
  authenticateToken,
  [
    body('pushToken').notEmpty().withMessage('Push token is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { pushToken } = req.body;

      const result = await notificationService.unregisterDevice(
        req.user.id,
        pushToken
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to unregister device', {
        userId: req.user.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to unregister device'
      });
    }
  }
);

/**
 * @route   POST /api/notifications/send
 * @desc    Send a notification to user (admin/system use)
 * @access  Private
 */
router.post('/send',
  authenticateToken,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('body').notEmpty().withMessage('Body is required'),
    body('data').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { title, body, data, badge, priority } = req.body;

      const result = await notificationService.sendNotification(
        req.user.id,
        {
          title,
          body,
          data,
          badge,
          priority
        }
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to send notification', {
        userId: req.user.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send notification'
      });
    }
  }
);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await notificationService.getNotificationPreferences(req.user.id);

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Preferences not found'
      });
    }

    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    logger.error('Failed to get notification preferences', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve preferences'
    });
  }
});

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/preferences',
  authenticateToken,
  [
    body('notifications_enabled').optional().isBoolean(),
    body('daily_reminder_time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('reminder_days').optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const preferences = req.body;

      const result = await notificationService.updateNotificationPreferences(
        req.user.id,
        preferences
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to update notification preferences', {
        userId: req.user.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update preferences'
      });
    }
  }
);

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification
 * @access  Private
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const result = await notificationService.sendNotification(
      req.user.id,
      {
        title: 'Test Notification',
        body: 'This is a test notification from ZEZE!',
        data: { type: 'test' },
        badge: 1,
        priority: 'high'
      }
    );

    res.json({
      success: true,
      message: 'Test notification sent',
      ...result
    });
  } catch (error) {
    logger.error('Failed to send test notification', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test notification'
    });
  }
});

module.exports = router;
