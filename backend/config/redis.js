const Redis = require('ioredis');
const logger = require('./logger');

let redisConfig;

if (process.env.REDIS_URL) {
  // Parse Redis URL manually to avoid parsing issues
  try {
    const url = new URL(process.env.REDIS_URL);
    redisConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password,
      username: url.username || 'default',
      tls: url.protocol === 'rediss:' ? {} : false,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 0, // Disable retries to fail fast
      lazyConnect: true,
      connectTimeout: 5000, // 5 second timeout
      commandTimeout: 5000,
      // Additional options for Upstash compatibility
      enableReadyCheck: false,
      keepAlive: false
    };
    logger.info('Parsed Redis URL successfully', { host: url.hostname, port: url.port });
  } catch (urlError) {
    logger.error('Failed to parse Redis URL, falling back to no Redis', urlError);
    // Create a dummy config that will fail gracefully
    redisConfig = {
      host: 'invalid.host',
      port: 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 0,
      lazyConnect: true,
      connectTimeout: 1000,
      commandTimeout: 1000
    };
  }
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

// Create Redis client with better error handling
let redis;

try {
  redis = new Redis(redisConfig);

  redis.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', err);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('ready', () => {
    logger.info('Redis client ready');
  });

} catch (error) {
  logger.error('Failed to create Redis client', error);
  // Create a dummy client that fails gracefully
  redis = {
    set: () => Promise.reject(new Error('Redis not available')),
    get: () => Promise.reject(new Error('Redis not available')),
    del: () => Promise.reject(new Error('Redis not available')),
    setex: () => Promise.reject(new Error('Redis not available')),
    ping: () => Promise.reject(new Error('Redis not available')),
    info: () => Promise.reject(new Error('Redis not available')),
    connect: () => Promise.reject(new Error('Redis not available')),
    disconnect: () => Promise.resolve()
  };
}

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