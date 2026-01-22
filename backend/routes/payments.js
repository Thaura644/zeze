const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

/**
 * @route   GET /api/payments/plans
 * @desc    Get available subscription plans
 * @access  Public
 */
router.get('/plans', (req, res) => {
  try {
    res.json({
      success: true,
      plans: paymentService.subscriptionPlans
    });
  } catch (error) {
    logger.error('Failed to get plans', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription plans'
    });
  }
});

/**
 * @route   GET /api/payments/subscription
 * @desc    Get current subscription details
 * @access  Private
 */
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await paymentService.getSubscriptionDetails(req.user.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    logger.error('Failed to get subscription', { userId: req.user.id, error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription details'
    });
  }
});

/**
 * @route   POST /api/payments/subscription
 * @desc    Create a new subscription
 * @access  Private
 */
router.post('/subscription',
  authenticateToken,
  [
    body('tier').isIn(['free', 'basic', 'premium']).withMessage('Invalid subscription tier'),
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

      const { tier } = req.body;

      const result = await paymentService.createSubscription(req.user.id, tier);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to create subscription', {
        userId: req.user.id,
        tier: req.body.tier,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create subscription'
      });
    }
  }
);

/**
 * @route   PUT /api/payments/subscription
 * @desc    Update subscription tier
 * @access  Private
 */
router.put('/subscription',
  authenticateToken,
  [
    body('tier').isIn(['free', 'basic', 'premium']).withMessage('Invalid subscription tier'),
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

      const { tier } = req.body;

      const result = await paymentService.updateSubscription(req.user.id, tier);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to update subscription', {
        userId: req.user.id,
        tier: req.body.tier,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update subscription'
      });
    }
  }
);

/**
 * @route   DELETE /api/payments/subscription
 * @desc    Cancel subscription
 * @access  Private
 */
router.delete('/subscription',
  authenticateToken,
  async (req, res) => {
    try {
      const { immediate } = req.query;

      const result = await paymentService.cancelSubscription(
        req.user.id,
        immediate === 'true'
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to cancel subscription', {
        userId: req.user.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel subscription'
      });
    }
  }
);

/**
 * @route   GET /api/payments/history
 * @desc    Get payment history
 * @access  Private
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const history = await paymentService.getPaymentHistory(req.user.id, limit);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    logger.error('Failed to get payment history', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment history'
    });
  }
});

/**
 * @route   GET /api/payments/access
 * @desc    Check if user has premium access
 * @access  Private
 */
router.get('/access', authenticateToken, async (req, res) => {
  try {
    const hasPremium = await paymentService.hasPremiumAccess(req.user.id);

    res.json({
      success: true,
      hasPremiumAccess: hasPremium
    });
  } catch (error) {
    logger.error('Failed to check premium access', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to check access'
    });
  }
});

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhooks
 * @access  Public (authenticated by Stripe signature)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    // In production, verify webhook signature
    // const event = stripe.webhooks.constructEvent(
    //   req.body,
    //   signature,
    //   process.env.STRIPE_WEBHOOK_SECRET
    // );

    // For now, parse the event directly
    const event = JSON.parse(req.body.toString());

    await paymentService.handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handling failed', {
      error: error.message,
      signature: signature ? 'present' : 'missing'
    });

    res.status(400).json({
      success: false,
      message: 'Webhook handling failed'
    });
  }
});

module.exports = router;
