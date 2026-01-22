const paymentService = require('../../services/paymentService');
const { pool } = require('../../config/database');

describe('PaymentService', () => {
  let testUserId;

  beforeAll(async () => {
    // Create a test user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3) RETURNING id`,
      ['payment.test@zeze.app', 'hashedpassword', 'Payment Test User']
    );
    testUserId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('Subscription Plans', () => {
    it('should have valid subscription plans', () => {
      expect(paymentService.subscriptionPlans).toBeDefined();
      expect(paymentService.subscriptionPlans.free).toBeDefined();
      expect(paymentService.subscriptionPlans.basic).toBeDefined();
      expect(paymentService.subscriptionPlans.premium).toBeDefined();
    });

    it('should have correct pricing for each tier', () => {
      expect(paymentService.subscriptionPlans.free.price).toBe(0);
      expect(paymentService.subscriptionPlans.basic.price).toBe(999);
      expect(paymentService.subscriptionPlans.premium.price).toBe(1999);
    });

    it('should have features defined for each tier', () => {
      expect(Array.isArray(paymentService.subscriptionPlans.free.features)).toBe(true);
      expect(Array.isArray(paymentService.subscriptionPlans.basic.features)).toBe(true);
      expect(Array.isArray(paymentService.subscriptionPlans.premium.features)).toBe(true);
    });
  });

  describe('createCustomer', () => {
    it('should create a Stripe customer (mock mode)', async () => {
      const result = await paymentService.createCustomer(
        testUserId,
        'payment.test@zeze.app',
        'Payment Test User'
      );

      expect(result).toHaveProperty('customerId');
      expect(result.customerId).toMatch(/^cus_mock_/);

      // Verify customer ID was stored in database
      const userQuery = await pool.query(
        'SELECT stripe_customer_id FROM users WHERE id = $1',
        [testUserId]
      );
      expect(userQuery.rows[0].stripe_customer_id).toBe(result.customerId);
    });
  });

  describe('createSubscription', () => {
    it('should create a free subscription', async () => {
      const result = await paymentService.createSubscription(testUserId, 'free');

      expect(result.success).toBe(true);
      expect(result.tier).toBe('free');

      // Verify in database
      const userQuery = await pool.query(
        'SELECT subscription_tier, subscription_status FROM users WHERE id = $1',
        [testUserId]
      );
      expect(userQuery.rows[0].subscription_tier).toBe('free');
      expect(userQuery.rows[0].subscription_status).toBe('active');
    });

    it('should create a basic subscription (mock mode)', async () => {
      const result = await paymentService.createSubscription(testUserId, 'basic');

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toMatch(/^sub_mock_/);
      expect(result.tier).toBe('basic');
      expect(result.status).toBe('active');

      // Verify in database
      const userQuery = await pool.query(
        'SELECT subscription_tier, subscription_status FROM users WHERE id = $1',
        [testUserId]
      );
      expect(userQuery.rows[0].subscription_tier).toBe('basic');
      expect(userQuery.rows[0].subscription_status).toBe('active');
    });

    it('should throw error for invalid tier', async () => {
      await expect(paymentService.createSubscription(testUserId, 'invalid'))
        .rejects.toThrow('Invalid subscription tier');
    });
  });

  describe('getSubscriptionDetails', () => {
    it('should return subscription details', async () => {
      // First create a subscription
      await paymentService.createSubscription(testUserId, 'premium');

      const details = await paymentService.getSubscriptionDetails(testUserId);

      expect(details).toBeDefined();
      expect(details.subscription_tier).toBe('premium');
      expect(details.plan).toBeDefined();
      expect(details.plan.name).toBe('Premium');
    });

    it('should return null for non-existent user', async () => {
      const details = await paymentService.getSubscriptionDetails(999999);
      expect(details).toBeNull();
    });
  });

  describe('hasPremiumAccess', () => {
    it('should return true for basic tier', async () => {
      await paymentService.createSubscription(testUserId, 'basic');

      const hasAccess = await paymentService.hasPremiumAccess(testUserId);
      expect(hasAccess).toBe(true);
    });

    it('should return true for premium tier', async () => {
      await paymentService.createSubscription(testUserId, 'premium');

      const hasAccess = await paymentService.hasPremiumAccess(testUserId);
      expect(hasAccess).toBe(true);
    });

    it('should return false for free tier', async () => {
      await paymentService.createSubscription(testUserId, 'free');

      const hasAccess = await paymentService.hasPremiumAccess(testUserId);
      expect(hasAccess).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const hasAccess = await paymentService.hasPremiumAccess(999999);
      expect(hasAccess).toBe(false);
    });
  });

  describe('cancelSubscription', () => {
    beforeEach(async () => {
      // Create a subscription before each cancel test
      await paymentService.createSubscription(testUserId, 'basic');
    });

    it('should cancel subscription immediately', async () => {
      const result = await paymentService.cancelSubscription(testUserId, true);

      expect(result.success).toBe(true);
      expect(result.immediate).toBe(true);

      // Verify in database
      const userQuery = await pool.query(
        'SELECT subscription_tier, subscription_status FROM users WHERE id = $1',
        [testUserId]
      );
      expect(userQuery.rows[0].subscription_tier).toBe('free');
      expect(userQuery.rows[0].subscription_status).toBe('canceled');
    });

    it('should schedule cancellation at period end', async () => {
      const result = await paymentService.cancelSubscription(testUserId, false);

      expect(result.success).toBe(true);
      expect(result.immediate).toBe(false);

      // Verify in database
      const userQuery = await pool.query(
        'SELECT cancel_at_period_end FROM users WHERE id = $1',
        [testUserId]
      );
      expect(userQuery.rows[0].cancel_at_period_end).toBe(true);
    });

    it('should throw error for user without subscription', async () => {
      // Delete subscription first
      await pool.query(
        'UPDATE users SET stripe_subscription_id = NULL WHERE id = $1',
        [testUserId]
      );

      await expect(paymentService.cancelSubscription(testUserId))
        .rejects.toThrow('No active subscription found');
    });
  });

  describe('updateSubscription', () => {
    it('should upgrade from free to basic', async () => {
      await paymentService.createSubscription(testUserId, 'free');

      const result = await paymentService.updateSubscription(testUserId, 'basic');

      expect(result.success).toBe(true);
      expect(result.tier).toBe('basic');
    });

    it('should upgrade from basic to premium', async () => {
      await paymentService.createSubscription(testUserId, 'basic');

      const result = await paymentService.updateSubscription(testUserId, 'premium');

      expect(result.success).toBe(true);
      expect(result.tier).toBe('premium');
    });

    it('should downgrade to free by canceling subscription', async () => {
      await paymentService.createSubscription(testUserId, 'premium');

      const result = await paymentService.updateSubscription(testUserId, 'free');

      expect(result.success).toBe(true);
    });

    it('should throw error for invalid tier', async () => {
      await expect(paymentService.updateSubscription(testUserId, 'invalid'))
        .rejects.toThrow('Invalid subscription tier');
    });
  });

  describe('webhook handling', () => {
    it('should handle subscription created event', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test',
            metadata: { userId: testUserId.toString() },
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // +30 days
            items: {
              data: [{
                price: {
                  id: paymentService.subscriptionPlans.basic.priceId
                }
              }]
            }
          }
        }
      };

      const result = await paymentService.handleWebhook(event);
      expect(result.success).toBe(true);
    });

    it('should handle subscription deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test',
            metadata: { userId: testUserId.toString() }
          }
        }
      };

      const result = await paymentService.handleWebhook(event);
      expect(result.success).toBe(true);

      // Verify tier was downgraded
      const userQuery = await pool.query(
        'SELECT subscription_tier FROM users WHERE id = $1',
        [testUserId]
      );
      expect(userQuery.rows[0].subscription_tier).toBe('free');
    });
  });
});
