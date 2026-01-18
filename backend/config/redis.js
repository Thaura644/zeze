const Redis = require('ioredis');
const logger = require('./logger');

let redisConfig;

if (process.env.REDIS_URL) {
  // Use REDIS_URL for production (Upstash, etc.)
  redisConfig = {
    url: process.env.REDIS_URL,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 0, // Disable retries to fail fast
    lazyConnect: true,
    connectTimeout: 5000, // 5 second timeout
    commandTimeout: 5000
  };
} else {
  // Fallback to individual environment variables for development
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 0, // Disable retries to fail fast
    lazyConnect: true,
    connectTimeout: 5000, // 5 second timeout
    commandTimeout: 5000
  };
}

// Create Redis client
const redis = new Redis(redisConfig);

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error('Redis connection error', err);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Redis helper functions with fallback for when Redis is unavailable
const cache = {
  // Set cache with TTL
  set: async (key, value, ttl = 3600) => {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttl, serializedValue);
      logger.debug(`Cached data for key: ${key}`);
    } catch (error) {
      logger.warn(`Cache set failed for key: ${key}, continuing without caching`, {
        error: error.message
      });
      // Don't throw error - allow operation to continue
    }
  },

  // Get cache
  get: async (key) => {
    try {
      const value = await redis.get(key);
      if (value === null) return null;
      return JSON.parse(value);
    } catch (error) {
      logger.warn(`Cache get failed for key: ${key}, returning null`, {
        error: error.message
      });
      return null;
    }
  },

  // Delete cache
  delete: async (key) => {
    try {
      await redis.del(key);
      logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      logger.warn(`Cache delete failed for key: ${key}, continuing`, {
        error: error.message
      });
      // Don't throw error - allow operation to continue
    }
  },

  // Clear all cache
  clear: async () => {
    try {
      await redis.flushdb();
      logger.info('Cache cleared');
    } catch (error) {
      logger.warn('Cache clear failed, continuing', {
        error: error.message
      });
      // Don't throw error - allow operation to continue
    }
  }
};

module.exports = {
  redis,
  cache
};