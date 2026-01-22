const logger = require('../config/logger');
const { pool } = require('../config/database');
const cron = require('node-cron');

/**
 * Push Notification Service
 * Handles sending push notifications to users for reminders, achievements, etc.
 */
class NotificationService {
  constructor() {
    this.expo = null;
    this.initializeExpo();
    this.setupCronJobs();
  }

  /**
   * Initialize Expo Push Notification service
   */
  initializeExpo() {
    try {
      // For production, install: npm install expo-server-sdk
      // const { Expo } = require('expo-server-sdk');
      // this.expo = new Expo();

      logger.info('Expo Push Notification service initialized (mock mode)');
    } catch (error) {
      logger.warn('Expo SDK not installed, running in mock mode', { error: error.message });
    }
  }

  /**
   * Setup cron jobs for scheduled notifications
   */
  setupCronJobs() {
    // Daily practice reminder - runs every day at user's preferred time
    cron.schedule('0 * * * *', () => {
      this.sendDailyReminders();
    });

    // Weekly progress summary - runs every Monday at 9 AM
    cron.schedule('0 9 * * 1', () => {
      this.sendWeeklyProgressSummary();
    });

    // Milestone achievements check - runs every hour
    cron.schedule('0 * * * *', () => {
      this.checkAndSendMilestoneNotifications();
    });

    logger.info('Notification cron jobs scheduled');
  }

  /**
   * Register a device for push notifications
   */
  async registerDevice(userId, pushToken, deviceInfo = {}) {
    try {
      // Validate Expo push token
      if (!this.isValidExpoPushToken(pushToken)) {
        throw new Error('Invalid Expo push token');
      }

      // Store or update device token in database
      const query = `
        INSERT INTO user_devices (user_id, push_token, device_type, device_name, last_active)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id, push_token)
        DO UPDATE SET
          last_active = NOW(),
          device_type = EXCLUDED.device_type,
          device_name = EXCLUDED.device_name
        RETURNING id
      `;

      const result = await pool.query(query, [
        userId,
        pushToken,
        deviceInfo.type || 'unknown',
        deviceInfo.name || 'Unknown Device'
      ]);

      logger.info('Device registered for push notifications', {
        userId,
        deviceId: result.rows[0].id
      });

      return { success: true, deviceId: result.rows[0].id };
    } catch (error) {
      logger.error('Failed to register device', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Unregister a device
   */
  async unregisterDevice(userId, pushToken) {
    try {
      const query = `
        DELETE FROM user_devices
        WHERE user_id = $1 AND push_token = $2
      `;

      await pool.query(query, [userId, pushToken]);

      logger.info('Device unregistered', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to unregister device', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Send push notification to a user
   */
  async sendNotification(userId, notification) {
    try {
      // Get user's devices
      const devicesQuery = `
        SELECT push_token FROM user_devices
        WHERE user_id = $1 AND last_active > NOW() - INTERVAL '30 days'
      `;

      const devicesResult = await pool.query(devicesQuery, [userId]);

      if (devicesResult.rows.length === 0) {
        logger.info('No active devices found for user', { userId });
        return { success: false, reason: 'No active devices' };
      }

      const pushTokens = devicesResult.rows.map(row => row.push_token);

      // Send notifications
      const messages = pushTokens.map(token => ({
        to: token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge,
        priority: notification.priority || 'default',
        ttl: notification.ttl || 86400, // 24 hours
      }));

      const result = await this.sendPushNotifications(messages);

      // Log notification
      await this.logNotification(userId, notification, result);

      return result;
    } catch (error) {
      logger.error('Failed to send notification', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Send push notifications via Expo
   */
  async sendPushNotifications(messages) {
    if (!this.expo) {
      // Mock mode for development
      logger.info('Sending push notifications (mock mode)', {
        count: messages.length,
        messages: messages.map(m => ({ to: m.to, title: m.title }))
      });

      return {
        success: true,
        sent: messages.length,
        failed: 0
      };
    }

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          logger.error('Failed to send notification chunk', { error: error.message });
        }
      }

      // Count successes and failures
      const sent = tickets.filter(ticket => ticket.status === 'ok').length;
      const failed = tickets.filter(ticket => ticket.status === 'error').length;

      logger.info('Push notifications sent', { sent, failed, total: messages.length });

      return { success: true, sent, failed, tickets };
    } catch (error) {
      logger.error('Failed to send push notifications', { error: error.message });
      throw error;
    }
  }

  /**
   * Send daily practice reminders
   */
  async sendDailyReminders() {
    try {
      const currentHour = new Date().getHours();

      // Get users who have reminders enabled for this hour
      const query = `
        SELECT u.id, u.display_name, u.daily_reminder_time
        FROM users u
        WHERE u.notifications_enabled = true
        AND EXTRACT(HOUR FROM u.daily_reminder_time) = $1
      `;

      const result = await pool.query(query, [currentHour]);

      for (const user of result.rows) {
        await this.sendNotification(user.id, {
          title: 'Time to Practice! 🎸',
          body: `Hey ${user.display_name}, your guitar is waiting for you. Even 10 minutes makes a difference!`,
          data: { type: 'daily_reminder' },
          badge: 1
        });
      }

      logger.info('Daily reminders sent', { count: result.rows.length });
    } catch (error) {
      logger.error('Failed to send daily reminders', { error: error.message });
    }
  }

  /**
   * Send weekly progress summary
   */
  async sendWeeklyProgressSummary() {
    try {
      // Get users with practice activity in the last week
      const query = `
        SELECT
          u.id,
          u.display_name,
          COUNT(ps.id) as session_count,
          SUM(ps.duration) as total_duration,
          AVG(ps.overall_accuracy) as avg_accuracy
        FROM users u
        INNER JOIN practice_sessions ps ON u.id = ps.user_id
        WHERE ps.created_at > NOW() - INTERVAL '7 days'
        AND u.notifications_enabled = true
        GROUP BY u.id, u.display_name
      `;

      const result = await pool.query(query);

      for (const user of result.rows) {
        const hours = Math.floor(user.total_duration / 3600);
        const minutes = Math.floor((user.total_duration % 3600) / 60);

        await this.sendNotification(user.id, {
          title: 'Weekly Progress Report 📊',
          body: `Great work ${user.display_name}! You practiced ${hours}h ${minutes}m this week across ${user.session_count} sessions with ${Math.round(user.avg_accuracy)}% accuracy.`,
          data: {
            type: 'weekly_summary',
            stats: {
              sessions: user.session_count,
              duration: user.total_duration,
              accuracy: user.avg_accuracy
            }
          },
          badge: 1
        });
      }

      logger.info('Weekly progress summaries sent', { count: result.rows.length });
    } catch (error) {
      logger.error('Failed to send weekly summaries', { error: error.message });
    }
  }

  /**
   * Check and send milestone notifications
   */
  async checkAndSendMilestoneNotifications() {
    try {
      // Check for users who recently achieved milestones
      const milestones = [
        { sessions: 10, title: 'Beginner', message: 'You\'ve completed 10 practice sessions!' },
        { sessions: 50, title: 'Dedicated', message: 'Amazing! 50 practice sessions completed!' },
        { sessions: 100, title: 'Committed', message: 'Incredible! 100 practice sessions under your belt!' },
        { sessions: 500, title: 'Expert', message: 'Outstanding! 500 practice sessions - you\'re a pro!' },
      ];

      for (const milestone of milestones) {
        const query = `
          SELECT u.id, u.display_name, COUNT(ps.id) as session_count
          FROM users u
          INNER JOIN practice_sessions ps ON u.id = ps.user_id
          WHERE u.notifications_enabled = true
          GROUP BY u.id, u.display_name
          HAVING COUNT(ps.id) = $1
        `;

        const result = await pool.query(query, [milestone.sessions]);

        for (const user of result.rows) {
          await this.sendNotification(user.id, {
            title: `🏆 Milestone: ${milestone.title}!`,
            body: milestone.message,
            data: {
              type: 'milestone',
              milestone: milestone.title,
              sessions: milestone.sessions
            },
            badge: 1,
            priority: 'high'
          });
        }
      }
    } catch (error) {
      logger.error('Failed to check milestones', { error: error.message });
    }
  }

  /**
   * Send notification when a song processing is complete
   */
  async sendSongProcessingComplete(userId, songTitle) {
    try {
      await this.sendNotification(userId, {
        title: 'Song Ready! ✨',
        body: `${songTitle} has been processed and is ready to learn!`,
        data: {
          type: 'song_ready',
          song: songTitle
        },
        badge: 1,
        priority: 'high'
      });
    } catch (error) {
      logger.error('Failed to send song ready notification', { error: error.message });
    }
  }

  /**
   * Send notification for practice streak
   */
  async sendStreakNotification(userId, streakDays) {
    try {
      const messages = {
        7: '7 day streak! 🔥 You\'re on fire!',
        30: '30 day streak! 🌟 Incredible dedication!',
        100: '100 day streak! 💎 You\'re a legend!',
      };

      const message = messages[streakDays];

      if (message) {
        await this.sendNotification(userId, {
          title: 'Practice Streak!',
          body: message,
          data: {
            type: 'streak',
            days: streakDays
          },
          badge: 1,
          priority: 'high'
        });
      }
    } catch (error) {
      logger.error('Failed to send streak notification', { error: error.message });
    }
  }

  /**
   * Validate Expo push token format
   */
  isValidExpoPushToken(token) {
    return (
      token &&
      (token.startsWith('ExponentPushToken[') ||
        token.startsWith('ExpoPushToken[') ||
        /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/i.test(token))
    );
  }

  /**
   * Log notification to database
   */
  async logNotification(userId, notification, result) {
    try {
      const query = `
        INSERT INTO notification_log (user_id, title, body, type, sent_at, success)
        VALUES ($1, $2, $3, $4, NOW(), $5)
      `;

      await pool.query(query, [
        userId,
        notification.title,
        notification.body,
        notification.data?.type || 'general',
        result.success
      ]);
    } catch (error) {
      logger.warn('Failed to log notification', { error: error.message });
    }
  }

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(userId) {
    try {
      const query = `
        SELECT
          notifications_enabled,
          daily_reminder_time,
          reminder_days,
          achievement_notifications,
          progress_notifications
        FROM users
        WHERE id = $1
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get notification preferences', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      const updates = [];
      const values = [userId];
      let paramCount = 2;

      if (preferences.notifications_enabled !== undefined) {
        updates.push(`notifications_enabled = $${paramCount}`);
        values.push(preferences.notifications_enabled);
        paramCount++;
      }

      if (preferences.daily_reminder_time) {
        updates.push(`daily_reminder_time = $${paramCount}`);
        values.push(preferences.daily_reminder_time);
        paramCount++;
      }

      if (preferences.reminder_days) {
        updates.push(`reminder_days = $${paramCount}`);
        values.push(JSON.stringify(preferences.reminder_days));
        paramCount++;
      }

      if (updates.length === 0) {
        return { success: true };
      }

      const query = `
        UPDATE users
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `;

      await pool.query(query, values);

      logger.info('Notification preferences updated', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to update notification preferences', { error: error.message });
      throw error;
    }
  }
}

module.exports = new NotificationService();
