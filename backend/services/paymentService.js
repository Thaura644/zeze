const logger = require('../config/logger');
const { pool } = require('../config/database');

/**
 * Payment and Subscription Service
 * Handles Stripe payment processing and subscription management
 */
class PaymentService {
  constructor() {
    this.stripe = null;
    this.initializeStripe();

    // Subscription tier pricing (in cents)
    this.subscriptionPlans = {
      free: {
        name: 'Free',
        price: 0,
        priceId: null,
        features: [
          'Basic chord detection',
          'Up to 5 songs per month',
          'Basic practice tracking',
          'Limited technique library'
        ]
      },
      basic: {
        name: 'Basic',
        price: 999, // $9.99/month
        priceId: process.env.STRIPE_BASIC_PRICE_ID,
        features: [
          'Unlimited songs',
          'Advanced chord detection',
          'Full technique library',
          'Practice analytics',
          'Offline mode',
          'Remove ads'
        ]
      },
      premium: {
        name: 'Premium',
        price: 1999, // $19.99/month
        priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
        features: [
          'Everything in Basic',
          'AI-powered feedback',
          'Personalized learning paths',
          'Real-time practice analysis',
          'Tablature generation',
          'Priority support',
          'Early access to features'
        ]
      }
    };
  }

  /**
   * Initialize Stripe SDK
   */
  initializeStripe() {
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        // For production: npm install stripe
        // const Stripe = require('stripe');
        // this.stripe = Stripe(process.env.STRIPE_SECRET_KEY);
        logger.info('Stripe payment service initialized (mock mode)');
      } else {
        logger.warn('Stripe API key not configured, running in mock mode');
      }
    } catch (error) {
      logger.warn('Stripe SDK not installed, running in mock mode', { error: error.message });
    }
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(userId, email, name) {
    try {
      if (!this.stripe) {
        // Mock mode
        const customerId = `cus_mock_${Date.now()}`;

        await pool.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [customerId, userId]
        );

        logger.info('Stripe customer created (mock)', { userId, customerId });
        return { customerId };
      }

      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: { userId: userId.toString() }
      });

      // Store customer ID in database
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, userId]
      );

      logger.info('Stripe customer created', { userId, customerId: customer.id });
      return { customerId: customer.id };
    } catch (error) {
      logger.error('Failed to create Stripe customer', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(userId, tier) {
    try {
      const plan = this.subscriptionPlans[tier];

      if (!plan) {
        throw new Error('Invalid subscription tier');
      }

      if (tier === 'free') {
        // Update user to free tier
        await pool.query(
          'UPDATE users SET subscription_tier = $1, subscription_status = $2 WHERE id = $3',
          ['free', 'active', userId]
        );

        return { success: true, tier: 'free' };
      }

      // Get or create Stripe customer
      const userQuery = await pool.query(
        'SELECT stripe_customer_id, email, display_name FROM users WHERE id = $1',
        [userId]
      );

      if (userQuery.rows.length === 0) {
        throw new Error('User not found');
      }

      let customerId = userQuery.rows[0].stripe_customer_id;

      if (!customerId) {
        const result = await this.createCustomer(
          userId,
          userQuery.rows[0].email,
          userQuery.rows[0].display_name
        );
        customerId = result.customerId;
      }

      if (!this.stripe) {
        // Mock mode
        const subscriptionId = `sub_mock_${Date.now()}`;

        await pool.query(
          `UPDATE users SET
            subscription_tier = $1,
            subscription_status = $2,
            stripe_subscription_id = $3,
            subscription_start_date = NOW(),
            subscription_end_date = NOW() + INTERVAL '1 month'
          WHERE id = $4`,
          [tier, 'active', subscriptionId, userId]
        );

        logger.info('Subscription created (mock)', { userId, tier, subscriptionId });

        return {
          success: true,
          subscriptionId,
          tier,
          status: 'active'
        };
      }

      // Create subscription in Stripe
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: plan.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Store subscription in database
      await pool.query(
        `UPDATE users SET
          subscription_tier = $1,
          subscription_status = $2,
          stripe_subscription_id = $3,
          subscription_start_date = NOW(),
          subscription_end_date = to_timestamp($4)
        WHERE id = $5`,
        [tier, subscription.status, subscription.id, subscription.current_period_end, userId]
      );

      logger.info('Subscription created', { userId, tier, subscriptionId: subscription.id });

      return {
        success: true,
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        tier,
        status: subscription.status
      };
    } catch (error) {
      logger.error('Failed to create subscription', { userId, tier, error: error.message });
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId, immediate = false) {
    try {
      const userQuery = await pool.query(
        'SELECT stripe_subscription_id, subscription_tier FROM users WHERE id = $1',
        [userId]
      );

      if (userQuery.rows.length === 0) {
        throw new Error('User not found');
      }

      const subscriptionId = userQuery.rows[0].stripe_subscription_id;

      if (!subscriptionId) {
        throw new Error('No active subscription found');
      }

      if (!this.stripe) {
        // Mock mode
        const status = immediate ? 'canceled' : 'active';
        const endDate = immediate ? new Date() : null;

        await pool.query(
          `UPDATE users SET
            subscription_status = $1,
            ${immediate ? 'subscription_end_date = NOW(),' : ''}
            ${immediate ? 'subscription_tier = \'free\'' : 'cancel_at_period_end = true'}
          WHERE id = $2`,
          [status, userId]
        );

        logger.info('Subscription canceled (mock)', { userId, immediate });

        return { success: true, status, immediate };
      }

      // Cancel in Stripe
      const subscription = immediate
        ? await this.stripe.subscriptions.cancel(subscriptionId)
        : await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
          });

      // Update database
      if (immediate) {
        await pool.query(
          `UPDATE users SET
            subscription_status = 'canceled',
            subscription_end_date = NOW(),
            subscription_tier = 'free'
          WHERE id = $1`,
          [userId]
        );
      } else {
        await pool.query(
          'UPDATE users SET cancel_at_period_end = true WHERE id = $1',
          [userId]
        );
      }

      logger.info('Subscription canceled', { userId, immediate });

      return {
        success: true,
        status: subscription.status,
        immediate
      };
    } catch (error) {
      logger.error('Failed to cancel subscription', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Update subscription tier
   */
  async updateSubscription(userId, newTier) {
    try {
      const plan = this.subscriptionPlans[newTier];

      if (!plan) {
        throw new Error('Invalid subscription tier');
      }

      const userQuery = await pool.query(
        'SELECT stripe_subscription_id, subscription_tier FROM users WHERE id = $1',
        [userId]
      );

      if (userQuery.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentTier = userQuery.rows[0].subscription_tier;
      const subscriptionId = userQuery.rows[0].stripe_subscription_id;

      // Downgrading to free
      if (newTier === 'free') {
        return await this.cancelSubscription(userId, false);
      }

      // Upgrading from free
      if (currentTier === 'free') {
        return await this.createSubscription(userId, newTier);
      }

      if (!this.stripe) {
        // Mock mode
        await pool.query(
          'UPDATE users SET subscription_tier = $1 WHERE id = $2',
          [newTier, userId]
        );

        logger.info('Subscription updated (mock)', { userId, newTier });

        return { success: true, tier: newTier };
      }

      // Update subscription in Stripe
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: plan.priceId,
        }],
        proration_behavior: 'create_prorations',
      });

      // Update database
      await pool.query(
        'UPDATE users SET subscription_tier = $1 WHERE id = $2',
        [newTier, userId]
      );

      logger.info('Subscription updated', { userId, oldTier: currentTier, newTier });

      return { success: true, tier: newTier };
    } catch (error) {
      logger.error('Failed to update subscription', { userId, newTier, error: error.message });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event) {
    try {
      logger.info('Processing Stripe webhook', { type: event.type });

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }

      return { success: true };
    } catch (error) {
      logger.error('Webhook handling failed', { error: error.message, event: event.type });
      throw error;
    }
  }

  /**
   * Handle subscription update webhook
   */
  async handleSubscriptionUpdate(subscription) {
    try {
      const userId = subscription.metadata.userId;

      if (!userId) {
        logger.warn('No userId in subscription metadata', { subscriptionId: subscription.id });
        return;
      }

      // Determine tier from price ID
      let tier = 'free';
      for (const [key, plan] of Object.entries(this.subscriptionPlans)) {
        if (plan.priceId === subscription.items.data[0].price.id) {
          tier = key;
          break;
        }
      }

      await pool.query(
        `UPDATE users SET
          subscription_tier = $1,
          subscription_status = $2,
          subscription_end_date = to_timestamp($3)
        WHERE id = $4`,
        [tier, subscription.status, subscription.current_period_end, userId]
      );

      logger.info('Subscription updated from webhook', { userId, tier, status: subscription.status });
    } catch (error) {
      logger.error('Failed to handle subscription update', { error: error.message });
    }
  }

  /**
   * Handle subscription deleted webhook
   */
  async handleSubscriptionDeleted(subscription) {
    try {
      const userId = subscription.metadata.userId;

      if (!userId) {
        logger.warn('No userId in subscription metadata', { subscriptionId: subscription.id });
        return;
      }

      await pool.query(
        `UPDATE users SET
          subscription_tier = 'free',
          subscription_status = 'canceled',
          subscription_end_date = NOW()
        WHERE id = $1`,
        [userId]
      );

      logger.info('Subscription deleted from webhook', { userId });
    } catch (error) {
      logger.error('Failed to handle subscription deletion', { error: error.message });
    }
  }

  /**
   * Handle payment succeeded webhook
   */
  async handlePaymentSucceeded(invoice) {
    try {
      const userId = invoice.subscription_details?.metadata?.userId;

      if (!userId) {
        return;
      }

      // Log successful payment
      await pool.query(
        `INSERT INTO payment_history (user_id, amount, currency, status, stripe_invoice_id, paid_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, invoice.amount_paid, invoice.currency, 'succeeded', invoice.id]
      );

      logger.info('Payment succeeded', { userId, amount: invoice.amount_paid });
    } catch (error) {
      logger.error('Failed to handle payment success', { error: error.message });
    }
  }

  /**
   * Handle payment failed webhook
   */
  async handlePaymentFailed(invoice) {
    try {
      const userId = invoice.subscription_details?.metadata?.userId;

      if (!userId) {
        return;
      }

      // Log failed payment
      await pool.query(
        `INSERT INTO payment_history (user_id, amount, currency, status, stripe_invoice_id, paid_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, invoice.amount_due, invoice.currency, 'failed', invoice.id]
      );

      // Optionally send notification to user
      logger.warn('Payment failed', { userId, amount: invoice.amount_due });
    } catch (error) {
      logger.error('Failed to handle payment failure', { error: error.message });
    }
  }

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(userId) {
    try {
      const query = `
        SELECT
          subscription_tier,
          subscription_status,
          subscription_start_date,
          subscription_end_date,
          cancel_at_period_end
        FROM users
        WHERE id = $1
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const subscription = result.rows[0];
      const plan = this.subscriptionPlans[subscription.subscription_tier];

      return {
        ...subscription,
        plan: {
          name: plan.name,
          price: plan.price,
          features: plan.features
        }
      };
    } catch (error) {
      logger.error('Failed to get subscription details', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId, limit = 10) {
    try {
      const query = `
        SELECT
          amount,
          currency,
          status,
          stripe_invoice_id,
          paid_at
        FROM payment_history
        WHERE user_id = $1
        ORDER BY paid_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get payment history', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Check if user has access to premium features
   */
  async hasPremiumAccess(userId) {
    try {
      const query = `
        SELECT subscription_tier, subscription_status
        FROM users
        WHERE id = $1
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return false;
      }

      const { subscription_tier, subscription_status } = result.rows[0];

      return (
        (subscription_tier === 'basic' || subscription_tier === 'premium') &&
        subscription_status === 'active'
      );
    } catch (error) {
      logger.error('Failed to check premium access', { userId, error: error.message });
      return false;
    }
  }
}

module.exports = new PaymentService();
