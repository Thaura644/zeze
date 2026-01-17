const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { cache } = require('./redis');
const logger = require('./logger');

class AuthMiddleware {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_REFRESH_EXPIRES_IN || '30d';
  }

  // Generate JWT tokens
  generateTokens(payload) {
    const jwtPayload = {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(jwtPayload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });

    const refreshToken = jwt.sign(
      { userId: payload.id, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.jwtRefreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Authentication middleware
  authenticate() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Access token required',
            code: 'MISSING_TOKEN'
          });
        }

        const token = authHeader.substring(7);
        const decoded = this.verifyToken(token);

        // Check if token is blacklisted
        const isBlacklisted = await cache.get(`blacklist_${token}`);
        if (isBlacklisted) {
          return res.status(401).json({
            error: 'Token has been revoked',
            code: 'TOKEN_REVOKED'
          });
        }

        // Attach user info to request
        req.user = decoded;
        req.token = token;
        
        next();
      } catch (error) {
        logger.warn('Authentication failed', { error: error.message });
        return res.status(401).json({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }
    };
  }

  // Optional authentication (doesn't fail if no token)
  optionalAuthenticate() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = this.verifyToken(token);
          
          // Check if token is blacklisted
          const isBlacklisted = await cache.get(`blacklist_${token}`);
          if (!isBlacklisted) {
            req.user = decoded;
            req.token = token;
          }
        }
        
        next();
      } catch (error) {
        // Silently fail for optional auth
        next();
      }
    };
  }

  // Rate limiting middleware
  rateLimit(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    const maxRequests = options.max || 100; // limit each IP to 100 requests per windowMs
    const message = options.message || 'Too many requests, please try again later';

    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [ip, timestamps] of requests.entries()) {
        const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
        if (validTimestamps.length === 0) {
          requests.delete(ip);
        } else {
          requests.set(ip, validTimestamps);
        }
      }

      // Get current requests for this IP
      const ipRequests = requests.get(key) || [];
      const recentRequests = ipRequests.filter(timestamp => timestamp > windowStart);

      if (recentRequests.length >= maxRequests) {
        return res.status(429).json({
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add current request
      recentRequests.push(now);
      requests.set(key, recentRequests);

      next();
    };
  }

  // Refresh token middleware
  refreshToken() {
    return async (req, res, next) => {
      try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
          return res.status(401).json({
            error: 'Refresh token required',
            code: 'MISSING_REFRESH_TOKEN'
          });
        }

        const decoded = this.verifyToken(refreshToken);

        if (decoded.type !== 'refresh') {
          return res.status(401).json({
            error: 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN'
          });
        }

        // Get user info from database (would be implemented in user service)
        req.user = { id: decoded.userId };
        req.refreshToken = refreshToken;
        
        next();
      } catch (error) {
        return res.status(401).json({
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }
    };
  }

  // Logout middleware
  logout() {
    return async (req, res, next) => {
      try {
        if (req.token) {
          // Add token to blacklist
          const decoded = this.verifyToken(req.token);
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          
          if (ttl > 0) {
            await cache.set(`blacklist_${req.token}`, true, ttl);
          }
        }

        next();
      } catch (error) {
        logger.error('Logout error', error);
        next();
      }
    };
  }
}

module.exports = new AuthMiddleware();