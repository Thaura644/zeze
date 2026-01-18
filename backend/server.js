require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import configurations
const logger = require('./config/logger');
const { query: dbQuery } = require('./config/database');

// Import Redis cache with fallback
let redisCache = null;
try {
  const { cache } = require('./config/redis');
  redisCache = cache;
} catch (error) {
  logger.warn('Redis not available, continuing without cache', { error: error.message });
  redisCache = {
    set: () => Promise.resolve(),
    get: () => Promise.resolve(null),
    delete: () => Promise.resolve(),
    clear: () => Promise.resolve()
  };
}

// Import database migrator
const databaseMigrator = require('./database/migrator');

// Import routes
const audioProcessingRoutes = require('./routes/audioProcessing');
const userRoutes = require('./routes/users');
const practiceRoutes = require('./routes/practice');
const songRoutes = require('./routes/songs');
const exerciseRoutes = require('./routes/exercises');
const versionRoutes = require('./routes/version');

// Import WebSocket manager
const websocketManager = require('./websocket/websocketManager');

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
}));

app.use(compression());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    let dbStatus = 'not_configured';
    let redisStatus = 'not_configured';

    // Check database connection if configured
    if (process.env.DATABASE_URL || process.env.DB_HOST) {
      dbStatus = await dbQuery('SELECT 1').then(() => 'healthy').catch((err) => {
        logger.debug('Database health check failed', { error: err.message });
        return 'unhealthy';
      });
    }

    // Check Redis connection if configured
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      redisStatus = await redisCache.set('health_check', 'ok', 10).then(() => 'healthy').catch((err) => {
        logger.debug('Redis health check failed', { error: err.message });
        return 'unhealthy';
      });
    }

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        websocket: websocketManager.getStats().connected_clients > 0 ? 'healthy' : 'idle'
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };

    // Server is always healthy if it can respond
    res.json(healthData);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed, but server is running'
    });
  }
});

// Ready check endpoint (for Kubernetes)
app.get('/ready', async (req, res) => {
  try {
    // Server is always ready to accept requests
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      note: 'Server ready despite service check error'
    });
  }
});

// Metrics endpoint (for Prometheus)
app.get('/metrics', (req, res) => {
  try {
    const stats = websocketManager.getStats();
    const memUsage = process.memoryUsage();
    
    const metrics = [
      `# HELP zeze_connected_clients Total number of WebSocket connections`,
      `# TYPE zeze_connected_clients gauge`,
      `zeze_connected_clients ${stats.connected_clients}`,
      '',
      `# HELP zeze_active_jobs Number of active job subscriptions`,
      `# TYPE zeze_active_jobs gauge`,
      `zeze_active_jobs ${stats.job_subscriptions}`,
      '',
      `# HELP zeze_active_sessions Number of active practice sessions`,
      `# TYPE zeze_active_sessions gauge`,
      `zeze_active_sessions ${stats.session_subscriptions}`,
      '',
      `# HELP zeze_memory_usage_bytes Memory usage in bytes`,
      `# TYPE zeze_memory_usage_bytes gauge`,
      `zeze_memory_usage_bytes{type="rss"} ${memUsage.rss}`,
      `zeze_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}`,
      `zeze_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}`,
      `zeze_memory_usage_bytes{type="external"} ${memUsage.external}`,
      '',
      `# HELP zeze_process_cpu_seconds_total Total CPU time in seconds`,
      `# TYPE zeze_process_cpu_seconds_total counter`,
      `zeze_process_cpu_seconds_total ${process.cpuUsage().user / 1000000}`,
      `zeze_process_cpu_seconds_total{type="system"} ${process.cpuUsage().system / 1000000}`
    ];

    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
  } catch (error) {
    logger.error('Metrics endpoint failed', { error: error.message });
    res.status(500).send('Metrics unavailable');
  }
});

// API routes
app.use('/api', audioProcessingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/version', versionRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'ZEZE Backend API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Guitar learning platform backend API',
    endpoints: {
      authentication: {
        'POST /api/users/register': 'Register new user',
        'POST /api/users/login': 'User login',
        'POST /api/users/refresh': 'Refresh access token',
        'POST /api/users/logout': 'User logout',
        'GET /api/users/profile': 'Get user profile',
        'PUT /api/users/profile': 'Update user profile',
        'GET /api/users/progress': 'Get user progress',
        'GET /api/users/recommendations': 'Get practice recommendations'
      },
      audio_processing: {
        'POST /api/process-youtube': 'Process YouTube URL',
        'GET /api/process-status/:jobId': 'Get processing status',
        'GET /api/song-results/:jobId': 'Get processed results',
        'POST /api/transpose': 'Transpose song',
        'GET /api/techniques/:songId/:timestamp': 'Get technique guidance'
      },
      practice: {
        'POST /api/practice/start': 'Start practice session',
        'POST /api/practice/end/:sessionId': 'End practice session',
        'POST /api/practice/analyze': 'Analyze practice performance',
        'GET /api/practice/sessions': 'Get user practice sessions',
        'GET /api/practice/sessions/:sessionId': 'Get specific practice session',
        'GET /api/practice/stats': 'Get practice statistics'
      },
      songs: {
        'GET /api/songs/search': 'Search songs',
        'GET /api/songs/:songId': 'Get song details',
        'GET /api/songs/popular/list': 'Get popular songs',
        'GET /api/songs/recommended/list': 'Get recommended songs',
        'POST /api/songs/:songId/save': 'Save song to library',
        'DELETE /api/songs/:songId/save': 'Remove song from library',
        'GET /api/songs/saved/list': 'Get user saved songs'
      },
      exercises: {
        'POST /api/exercises/generate-exercise': 'Generate new guitar exercise',
        'GET /api/exercises/audio/:exerciseId': 'Get exercise audio file',
        'GET /api/exercises/audio/:exerciseId/:speed': 'Get exercise audio with speed control',
        'POST /api/exercises/generate-variation/:exerciseId': 'Generate exercise variation',
        'GET /api/exercises/library': 'Get exercise library',
        'POST /api/exercises/load/:exerciseId': 'Load predefined exercise'
      }
    },
    websocket: {
      'wss://your-domain/ws': 'WebSocket connection endpoint',
      events: {
        'subscribe_job': 'Subscribe to job processing updates',
        'join_session': 'Join practice session for real-time feedback',
        'practice_data': 'Send real-time practice data'
      }
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎸 ZEZE Backend API Server',
    status: 'running',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api',
    health: '/health',
    websocket: '/ws'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: '/api'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(500).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Test database connection and run migrations (optional)
    if (process.env.DATABASE_URL || process.env.DB_HOST) {
      try {
        await dbQuery('SELECT 1');
        logger.info('Database connection established');

        // Run database migrations
        await databaseMigrator.initialize();

      } catch (dbError) {
        logger.warn('Database connection failed, starting without database', { error: dbError.message });
      }
    } else {
      logger.info('Database not configured, starting in offline mode');
    }

    // Test Redis connection (optional for startup)
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      try {
        await redisCache.set('startup_test', 'ok', 10);
        logger.info('Redis connection established');
      } catch (redisError) {
        logger.warn('Redis connection failed, starting without cache', { error: redisError.message });
      }
    } else {
      logger.info('Redis not configured, starting without cache');
    }

    // Test Redis connection (optional for startup)
    try {
      await redisCache.set('startup_test', 'ok', 10);
      logger.info('Redis connection established');
    } catch (redisError) {
      logger.warn('Redis connection failed, starting without cache', { error: redisError.message });
    }

    // Initialize WebSocket
    websocketManager.initialize(server);
    logger.info('WebSocket server initialized');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🎸 ZEZE Backend API Server running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`📖 API documentation: http://localhost:${PORT}/api`);
      logger.info(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown function
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close WebSocket connections
      if (websocketManager.io) {
        websocketManager.io.close(() => {
          logger.info('WebSocket server closed');
        });
      }

      // Close database connections
      const { pool } = require('./config/database');
      await pool.end();
      logger.info('Database connections closed');

      // Close Redis connections
      const { redis } = require('./config/redis');
      redis.disconnect();
      logger.info('Redis connections closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error: error.message });
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server };