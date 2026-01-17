const Redis = require('ioredis');
const logger = require('./logger');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
};

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

// Redis helper functions
const cache = {
  // Set cache with TTL
  set: async (key, value, ttl = 3600) => {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttl, serializedValue);
      logger.debug(`Cached data for key: ${key}`);
    } catch (error) {
      logger.error(`Cache set error for key: ${key}`, error);
      throw error;
    }
  },

  // Get cache
  get: async (key) => {
    try {
      const value = await redis.get(key);
      if (value === null) return null;
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Cache get error for key: ${key}`, error);
      return null;
    }
  },

  // Delete cache
  delete: async (key) => {
    try {
      await redis.del(key);
      logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error for key: ${key}`, error);
      throw error;
    }
  },

  // Clear all cache
  clear: async () => {
    try {
      await redis.flushdb();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error', error);
      throw error;
    }
  }
};

module.exports = {
  redis,
  cache
};