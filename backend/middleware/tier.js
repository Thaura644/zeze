const logger = require('../config/logger');
const { query: dbQuery } = require('../config/database');

const TIER_LIMITS = {
  free: { dailyProcesses: 1 },
  basic: { dailyProcesses: 5 },
  premium: { dailyProcesses: 100 }
};

const checkTierLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Get user tier
      const userResult = await dbQuery('SELECT subscription_tier FROM users WHERE id = $1', [userId]);
      const tier = userResult.rows[0]?.subscription_tier || 'free';

      if (limitType === 'dailyProcesses') {
        const limit = TIER_LIMITS[tier].dailyProcesses;

        // Count processes in last 24h
        const countResult = await dbQuery(
          "SELECT COUNT(*) FROM processing_jobs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 day'",
          [userId]
        );
        const count = parseInt(countResult.rows[0]?.count || 0);

        if (count >= limit) {
          return res.status(429).json({
            error: 'Tier limit reached',
            code: 'LIMIT_REACHED',
            message: `Your current plan (${tier}) allows ${limit} processes per day. Please upgrade for more.`
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Tier check failed, allowing by default', { error: error.message });
      next();
    }
  };
};

module.exports = { checkTierLimit };
