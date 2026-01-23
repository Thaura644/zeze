const express = require('express');
const { query } = require('../config/database');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

class UserService {
  // Create a new user
  async createUser(userData) {
    const {
      email,
      username,
      hashed_password,
      auth_provider = 'email',
      provider_id,
      display_name,
      skill_level = 1,
      preferred_genres = [],
      practice_goal,
      daily_reminder_time,
      timezone = 'UTC'
    } = userData;

    try {
      const result = await query(
        `INSERT INTO users (
          email, username, display_name, hashed_password, auth_provider, provider_id,
          skill_level, preferred_genres, practice_goal, daily_reminder_time, timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [email, username, display_name, hashed_password, auth_provider, provider_id,
         skill_level, preferred_genres, practice_goal, daily_reminder_time, timezone]
      );

      logger.info(`New user created: ${email}`);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint.includes('email')) {
          throw new Error('Email already exists');
        } else if (error.constraint.includes('username')) {
          throw new Error('Username already exists');
        }
      }
      logger.error('Failed to create user', { error: error.message, email });
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE user_id = $1 AND deleted_at IS NULL',
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get user by ID', { userId, error: error.message });
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get user by email', { email, error: error.message });
      throw error;
    }
  }

  // Get user by username
  async getUserByUsername(username) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL',
        [username]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get user by username', { username, error: error.message });
      throw error;
    }
  }

  // Get user by device ID
  async getUserByDeviceId(deviceId) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE current_device_id = $1 AND auth_provider = \'guest\' AND deleted_at IS NULL',
        [deviceId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get user by device ID', { deviceId, error: error.message });
      throw error;
    }
  }

  // Create guest user
  async createGuestUser(deviceId) {
    try {
      const username = `guest_${Math.random().toString(36).substring(2, 9)}`;
      const result = await query(
        `INSERT INTO users (
          username, display_name, auth_provider, current_device_id, skill_level
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [username, 'Guest User', 'guest', deviceId, 1]
      );

      logger.info(`New guest user created: ${username}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create guest user', { error: error.message, deviceId });
      throw error;
    }
  }

  // Update user profile
  async updateUser(userId, updateData) {
    const allowedFields = [
      'display_name', 'username', 'skill_level', 'preferred_genres', 
      'practice_goal', 'daily_reminder_time', 'timezone', 'current_device_id'
    ];
    
    const updates = [];
    const values = [userId];
    let paramIndex = 2;

    for (const [field, value] of Object.entries(updateData)) {
      if (allowedFields.includes(field) && value !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    try {
      const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE user_id = $1 RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info(`User updated: ${userId}`);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint.includes('username')) {
          throw new Error('Username already exists');
        }
      }
      logger.error('Failed to update user', { userId, error: error.message });
      throw error;
    }
  }

  // Update user password
  async updatePassword(userId, hashedPassword) {
    try {
      const result = await query(
        'UPDATE users SET hashed_password = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *',
        [hashedPassword, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info(`Password updated for user: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update password', { userId, error: error.message });
      throw error;
    }
  }

  // Soft delete user
  async deleteUser(userId) {
    try {
      const result = await query(
        'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING *',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info(`User deleted: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to delete user', { userId, error: error.message });
      throw error;
    }
  }

  // Update user login info
  async updateLoginInfo(userId, ipAddress, deviceInfo) {
    try {
      const result = await query(
        `UPDATE users SET 
          last_login_at = CURRENT_TIMESTAMP,
          last_ip_address = $2,
          current_device_id = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 RETURNING *`,
        [userId, ipAddress, deviceInfo]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update login info', { userId, error: error.message });
      throw error;
    }
  }

  // Get user progress summary
  async getUserProgress(userId) {
    try {
      const result = await query(
        `SELECT 
          u.user_id,
          u.email,
          u.username,
          u.display_name,
          u.skill_level,
          u.total_practice_time,
          u.songs_learned,
          u.consecutive_days,
          u.last_streak_date,
          
          -- Practice statistics
          COUNT(DISTINCT ps.session_id) as total_sessions,
          AVG(ps.overall_accuracy) as avg_session_accuracy,
          SUM(ps.duration_seconds) as total_practice_time_calculated,
          MAX(ps.start_time) as last_practice_time,
          
          -- Recent activity (last 7 days)
          COUNT(DISTINCT ps.session_id) FILTER (WHERE ps.start_time >= NOW() - INTERVAL '7 days') as sessions_last_7_days,
          
          -- Song statistics
          COUNT(DISTINCT us.song_id) as total_songs_saved,
          
          -- Skill breakdown
          COUNT(DISTINCT ps.session_id) FILTER (WHERE ps.session_type = 'technique_drill') as technique_sessions,
          COUNT(DISTINCT ps.session_id) FILTER (WHERE ps.session_type = 'song_practice') as song_sessions
          
        FROM users u
        LEFT JOIN practice_sessions ps ON u.user_id = ps.user_id
        LEFT JOIN user_songs us ON u.user_id = us.user_id
        WHERE u.user_id = $1 AND u.deleted_at IS NULL
        GROUP BY u.user_id, u.email, u.username, u.display_name, u.skill_level, 
                 u.total_practice_time, u.songs_learned, u.consecutive_days, u.last_streak_date`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get user progress', { userId, error: error.message });
      throw error;
    }
  }

  // Update user statistics
  async updateUserStats(userId, stats) {
    const {
      practiceTimeIncrement,
      songsLearnedIncrement,
      consecutiveDaysUpdate,
      lastStreakDate
    } = stats;

    const updates = [];
    const values = [userId];
    let paramIndex = 2;

    if (practiceTimeIncrement) {
      updates.push(`total_practice_time = total_practice_time + $${paramIndex}`);
      values.push(practiceTimeIncrement);
      paramIndex++;
    }

    if (songsLearnedIncrement) {
      updates.push(`songs_learned = songs_learned + $${paramIndex}`);
      values.push(songsLearnedIncrement);
      paramIndex++;
    }

    if (consecutiveDaysUpdate !== undefined) {
      updates.push(`consecutive_days = $${paramIndex}`);
      values.push(consecutiveDaysUpdate);
      paramIndex++;
    }

    if (lastStreakDate) {
      updates.push(`last_streak_date = $${paramIndex}`);
      values.push(lastStreakDate);
      paramIndex++;
    }

    if (updates.length === 0) {
      return;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    try {
      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE user_id = $1`,
        values
      );
    } catch (error) {
      logger.error('Failed to update user stats', { userId, error: error.message });
      throw error;
    }
  }

  // Update subscription info
  async updateSubscription(userId, tier, expiresAt) {
    try {
      const result = await query(
        `UPDATE users SET 
          subscription_tier = $2,
          subscription_expires_at = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 RETURNING *`,
        [userId, tier, expiresAt]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info(`Subscription updated for user: ${userId}, tier: ${tier}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update subscription', { userId, error: error.message });
      throw error;
    }
  }

  // Search users (admin function)
  async searchUsers(searchTerm, limit = 20, offset = 0) {
    try {
      const result = await query(
        `SELECT user_id, email, username, display_name, skill_level, 
                total_practice_time, songs_learned, created_at, last_login_at
        FROM users 
        WHERE deleted_at IS NULL AND (
          email ILIKE $1 OR 
          username ILIKE $1 OR 
          display_name ILIKE $1
        )
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
        [`%${searchTerm}%`, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to search users', { searchTerm, error: error.message });
      throw error;
    }
  }
}

module.exports = new UserService();