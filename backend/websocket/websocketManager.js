const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const { cache } = require('../config/redis');
const audioProcessingService = require('../services/audioProcessing');
const practiceService = require('../services/practiceService');

class WebSocketManager {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
    this.jobSubscriptions = new Map();
    this.sessionSubscriptions = new Map();
  }

  // Initialize WebSocket server
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if token is blacklisted (optional - skip if Redis is unavailable)
        try {
          const isBlacklisted = await cache.get(`blacklist_${token}`);
          if (isBlacklisted) {
            return next(new Error('Token has been revoked'));
          }
        } catch (cacheError) {
          logger.warn('Failed to check token blacklist in websocket, proceeding without check', {
            cacheError: cacheError.message
          });
          // Continue without blacklist check if Redis is unavailable
        }

        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        socket.username = decoded.username;
        
        logger.info(`WebSocket client authenticated: ${socket.userEmail} (${socket.id})`);
        next();
      } catch (error) {
        logger.warn('WebSocket authentication failed', { 
          socketId: socket.id, 
          error: error.message 
        });
        next(new Error('Authentication failed'));
      }
    });

    // Handle connections
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket server initialized');
  }

  // Handle new WebSocket connection
  handleConnection(socket) {
    const clientInfo = {
      socketId: socket.id,
      userId: socket.userId,
      email: socket.userEmail,
      username: socket.username,
      connectedAt: new Date(),
      subscriptions: new Set()
    };

    this.connectedClients.set(socket.id, clientInfo);
    logger.info(`Client connected: ${clientInfo.email} (${socket.id})`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to ZEZE WebSocket server',
      timestamp: new Date().toISOString(),
      userId: socket.userId
    });

    // Handle subscribing to job updates
    socket.on('subscribe_job', async (data) => {
      await this.handleJobSubscription(socket, data);
    });

    // Handle unsubscribing from job updates
    socket.on('unsubscribe_job', (data) => {
      this.handleJobUnsubscription(socket, data);
    });

    // Handle joining practice session
    socket.on('join_session', async (data) => {
      await this.handleSessionJoin(socket, data);
    });

    // Handle leaving practice session
    socket.on('leave_session', (data) => {
      this.handleSessionLeave(socket, data);
    });

    // Handle real-time practice data
    socket.on('practice_data', (data) => {
      this.handlePracticeData(socket, data);
    });

    // Handle heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', { 
        socketId: socket.id, 
        userId: socket.userId,
        error: error.message 
      });
    });
  }

  // Handle job subscription
  async handleJobSubscription(socket, data) {
    try {
      const { job_id } = data;

      if (!job_id) {
        socket.emit('error', { 
          message: 'Job ID is required',
          code: 'MISSING_JOB_ID'
        });
        return;
      }

      // Verify job exists and belongs to user
      const jobStatus = await audioProcessingService.getJobStatus(job_id);
      if (!jobStatus) {
        socket.emit('error', { 
          message: 'Job not found',
          code: 'JOB_NOT_FOUND'
        });
        return;
      }

      // Add to job subscriptions
      if (!this.jobSubscriptions.has(job_id)) {
        this.jobSubscriptions.set(job_id, new Set());
      }
      this.jobSubscriptions.get(job_id).add(socket.id);

      // Add to client subscriptions
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.subscriptions.add(`job:${job_id}`);
      }

      // Send current job status
      socket.emit('job_update', {
        type: 'status',
        job_id: job_id,
        ...jobStatus
      });

      // Start monitoring job if not already
      this.startJobMonitoring(job_id);

      logger.info(`Client subscribed to job: ${socket.userEmail} -> ${job_id}`);
    } catch (error) {
      logger.error('Failed to handle job subscription', { 
        socketId: socket.id,
        jobId: data.job_id,
        error: error.message 
      });
      
      socket.emit('error', { 
        message: 'Failed to subscribe to job updates',
        code: 'SUBSCRIPTION_ERROR'
      });
    }
  }

  // Handle job unsubscription
  handleJobUnsubscription(socket, data) {
    try {
      const { job_id } = data;

      if (!job_id) return;

      // Remove from job subscriptions
      if (this.jobSubscriptions.has(job_id)) {
        this.jobSubscriptions.get(job_id).delete(socket.id);
        if (this.jobSubscriptions.get(job_id).size === 0) {
          this.jobSubscriptions.delete(job_id);
        }
      }

      // Remove from client subscriptions
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.subscriptions.delete(`job:${job_id}`);
      }

      socket.emit('unsubscribed', { job_id, type: 'job' });
      logger.info(`Client unsubscribed from job: ${socket.userEmail} -> ${job_id}`);
    } catch (error) {
      logger.error('Failed to handle job unsubscription', { 
        socketId: socket.id,
        error: error.message 
      });
    }
  }

  // Handle practice session join
  async handleSessionJoin(socket, data) {
    try {
      const { session_id } = data;

      if (!session_id) {
        socket.emit('error', { 
          message: 'Session ID is required',
          code: 'MISSING_SESSION_ID'
        });
        return;
      }

      // Verify session exists and belongs to user
      const session = await practiceService.getPracticeSession(session_id, socket.userId);
      if (!session) {
        socket.emit('error', { 
          message: 'Practice session not found',
          code: 'SESSION_NOT_FOUND'
        });
        return;
      }

      // Add to session subscriptions
      if (!this.sessionSubscriptions.has(session_id)) {
        this.sessionSubscriptions.set(session_id, new Set());
      }
      this.sessionSubscriptions.get(session_id).add(socket.id);

      // Add to client subscriptions
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.subscriptions.add(`session:${session_id}`);
      }

      // Join socket.io room for the session
      socket.join(`session:${session_id}`);

      socket.emit('session_joined', { 
        session_id,
        message: 'Joined practice session'
      });

      logger.info(`Client joined session: ${socket.userEmail} -> ${session_id}`);
    } catch (error) {
      logger.error('Failed to handle session join', { 
        socketId: socket.id,
        sessionId: data.session_id,
        error: error.message 
      });
      
      socket.emit('error', { 
        message: 'Failed to join practice session',
        code: 'SESSION_JOIN_ERROR'
      });
    }
  }

  // Handle practice session leave
  handleSessionLeave(socket, data) {
    try {
      const { session_id } = data;

      if (!session_id) return;

      // Remove from session subscriptions
      if (this.sessionSubscriptions.has(session_id)) {
        this.sessionSubscriptions.get(session_id).delete(socket.id);
        if (this.sessionSubscriptions.get(session_id).size === 0) {
          this.sessionSubscriptions.delete(session_id);
        }
      }

      // Remove from client subscriptions
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.subscriptions.delete(`session:${session_id}`);
      }

      // Leave socket.io room
      socket.leave(`session:${session_id}`);

      socket.emit('session_left', { session_id, type: 'session' });
      logger.info(`Client left session: ${socket.userEmail} -> ${session_id}`);
    } catch (error) {
      logger.error('Failed to handle session leave', { 
        socketId: socket.id,
        error: error.message 
      });
    }
  }

  // Handle real-time practice data
  async handlePracticeData(socket, data) {
    try {
      const { session_id, timestamp, current_chord, accuracy, mistake_detected, encouragement } = data;

      if (!session_id) {
        socket.emit('error', { 
          message: 'Session ID is required',
          code: 'MISSING_SESSION_ID'
        });
        return;
      }

      // Store practice analysis
      await practiceService.addPracticeAnalysis(session_id, {
        timestamp,
        current_chord,
        accuracy,
        mistake_detected,
        encouragement,
        pitch_data: data.pitch_data,
        timing_data: data.timing_data
      });

      // Broadcast to session room (excluding sender)
      socket.to(`session:${session_id}`).emit('practice_feedback', {
        type: 'realtime_feedback',
        session_id,
        timestamp,
        current_chord,
        accuracy,
        mistake_detected,
        encouragement,
        user: socket.username
      });

      logger.debug(`Practice data received: ${socket.userEmail} -> ${session_id}`);
    } catch (error) {
      logger.error('Failed to handle practice data', { 
        socketId: socket.id,
        error: error.message 
      });
      
      socket.emit('error', { 
        message: 'Failed to process practice data',
        code: 'PRACTICE_DATA_ERROR'
      });
    }
  }

  // Start monitoring a job for updates
  startJobMonitoring(jobId) {
    if (this.jobMonitors && this.jobMonitors.has(jobId)) {
      return; // Already monitoring
    }

    if (!this.jobMonitors) {
      this.jobMonitors = new Map();
    }

    const monitor = setInterval(async () => {
      try {
        const jobStatus = await audioProcessingService.getJobStatus(jobId);
        
        if (!jobStatus) {
          this.stopJobMonitoring(jobId);
          return;
        }

        // Broadcast update to all subscribed clients
        this.broadcastJobUpdate(jobId, {
          type: 'progress_update',
          job_id: jobId,
          ...jobStatus
        });

        // Stop monitoring if job is completed or failed
        if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
          this.stopJobMonitoring(jobId);
        }
      } catch (error) {
        logger.error('Job monitoring error', { jobId, error: error.message });
      }
    }, 2000); // Check every 2 seconds

    this.jobMonitors.set(jobId, monitor);
  }

  // Stop monitoring a job
  stopJobMonitoring(jobId) {
    if (this.jobMonitors && this.jobMonitors.has(jobId)) {
      clearInterval(this.jobMonitors.get(jobId));
      this.jobMonitors.delete(jobId);
      logger.info(`Stopped monitoring job: ${jobId}`);
    }
  }

  // Broadcast job update to subscribed clients
  broadcastJobUpdate(jobId, update) {
    const subscribers = this.jobSubscriptions.get(jobId);
    if (!subscribers) return;

    subscribers.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('job_update', update);
      }
    });
  }

  // Handle client disconnection
  handleDisconnection(socket, reason) {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      logger.info(`Client disconnected: ${clientInfo.email} (${socket.id}) - ${reason}`);

      // Clean up subscriptions
      clientInfo.subscriptions.forEach(subscription => {
        const [type, id] = subscription.split(':');
        
        if (type === 'job') {
          this.handleJobUnsubscription(socket, { job_id: id });
        } else if (type === 'session') {
          this.handleSessionLeave(socket, { session_id: id });
        }
      });

      this.connectedClients.delete(socket.id);
    }
  }

  // Get server statistics
  getStats() {
    return {
      connected_clients: this.connectedClients.size,
      job_subscriptions: this.jobSubscriptions.size,
      session_subscriptions: this.sessionSubscriptions.size,
      active_job_monitors: this.jobMonitors ? this.jobMonitors.size : 0,
      clients: Array.from(this.connectedClients.values()).map(client => ({
        socketId: client.socketId,
        userId: client.userId,
        email: client.email,
        username: client.username,
        connectedAt: client.connectedAt,
        subscription_count: client.subscriptions.size
      }))
    };
  }

  // Broadcast to all connected clients
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Send to specific user
  sendToUser(userId, event, data) {
    this.io.to(userId).emit(event, data);
  }
}

module.exports = new WebSocketManager();