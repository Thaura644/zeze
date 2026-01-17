const express = require('express');
const { query, transaction } = require('../config/database');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

class PracticeService {
  // Start a new practice session
  async startPracticeSession(sessionData) {
    const {
      user_id,
      song_id,
      session_type = 'song_practice',
      focus_techniques = [],
      tempo_percentage = 100,
      transposition_key,
      device_type,
      app_version
    } = sessionData;

    try {
      const result = await query(
        `INSERT INTO practice_sessions (
          user_id, song_id, session_type, focus_techniques, 
          tempo_percentage, transposition_key, start_time, device_type, app_version
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
        RETURNING *`,
        [user_id, song_id, session_type, focus_techniques, 
         tempo_percentage, transposition_key, device_type, app_version]
      );

      logger.info(`Practice session started: ${result.rows[0].session_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to start practice session', { user_id, error: error.message });
      throw error;
    }
  }

  // End a practice session
  async endPracticeSession(sessionId, endData = {}) {
    const {
      duration_seconds,
      overall_accuracy,
      timing_accuracy,
      pitch_accuracy,
      rhythm_accuracy,
      chord_accuracy,
      section_accuracy,
      mistakes,
      improvement_areas,
      notes_played,
      chords_played,
      techniques_used,
      max_speed_bpm,
      avg_speed_bpm,
      user_rating,
      user_feedback,
      session_notes
    } = endData;

    try {
      const result = await query(
        `UPDATE practice_sessions SET 
          end_time = NOW(),
          duration_seconds = $2,
          overall_accuracy = $3,
          timing_accuracy = $4,
          pitch_accuracy = $5,
          rhythm_accuracy = $6,
          chord_accuracy = $7,
          section_accuracy = $8,
          mistakes = $9,
          improvement_areas = $10,
          notes_played = $11,
          chords_played = $12,
          techniques_used = $13,
          max_speed_bpm = $14,
          avg_speed_bpm = $15,
          user_rating = $16,
          user_feedback = $17,
          session_notes = $18
        WHERE session_id = $1 RETURNING *`,
        [sessionId, duration_seconds, overall_accuracy, timing_accuracy, pitch_accuracy,
         rhythm_accuracy, chord_accuracy, section_accuracy, mistakes, improvement_areas,
         notes_played, chords_played, techniques_used, max_speed_bpm, avg_speed_bpm,
         user_rating, user_feedback, session_notes]
      );

      if (result.rows.length === 0) {
        throw new Error('Practice session not found');
      }

      // Update user statistics
      await this.updateUserStats(result.rows[0].user_id, endData);

      logger.info(`Practice session ended: ${sessionId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to end practice session', { sessionId, error: error.message });
      throw error;
    }
  }

  // Get practice session by ID
  async getPracticeSession(sessionId, userId = null) {
    try {
      let queryText = 'SELECT * FROM practice_sessions WHERE session_id = $1';
      const queryParams = [sessionId];

      if (userId) {
        queryText += ' AND user_id = $2';
        queryParams.push(userId);
      }

      const result = await query(queryText, queryParams);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get practice session', { sessionId, error: error.message });
      throw error;
    }
  }

  // Get user's practice sessions
  async getUserPracticeSessions(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      session_type,
      start_date,
      end_date,
      order_by = 'start_time',
      order_direction = 'DESC'
    } = options;

    try {
      let queryText = `
        SELECT ps.*, s.title as song_title, s.artist as song_artist
        FROM practice_sessions ps
        LEFT JOIN songs s ON ps.song_id = s.song_id
        WHERE ps.user_id = $1
      `;
      const queryParams = [userId];
      let paramIndex = 2;

      if (session_type) {
        queryText += ` AND ps.session_type = $${paramIndex}`;
        queryParams.push(session_type);
        paramIndex++;
      }

      if (start_date) {
        queryText += ` AND ps.start_time >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        queryText += ` AND ps.start_time <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      queryText += ` ORDER BY ps.${order_by} ${order_direction}`;
      queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get user practice sessions', { userId, error: error.message });
      throw error;
    }
  }

  // Get user practice statistics
  async getUserPracticeStats(userId, timeFrame = '30d') {
    try {
      const timeFilter = this.getTimeFilter(timeFrame);
      
      const result = await query(
        `SELECT 
          COUNT(*) as total_sessions,
          AVG(overall_accuracy) as avg_accuracy,
          AVG(duration_seconds) as avg_duration,
          SUM(duration_seconds) as total_practice_time,
          MAX(overall_accuracy) as best_accuracy,
          COUNT(DISTINCT DATE(start_time)) as practice_days,
          
          -- Session type breakdown
          COUNT(*) FILTER (WHERE session_type = 'song_practice') as song_sessions,
          COUNT(*) FILTER (WHERE session_type = 'technique_drill') as technique_sessions,
          COUNT(*) FILTER (WHERE session_type = 'free_play') as free_play_sessions,
          
          -- Recent performance
          AVG(overall_accuracy) FILTER (WHERE start_time >= ${timeFilter}) as recent_accuracy,
          COUNT(*) FILTER (WHERE start_time >= ${timeFilter}) as recent_sessions
          
        FROM practice_sessions 
        WHERE user_id = $1 AND end_time IS NOT NULL`,
        [userId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get user practice stats', { userId, error: error.message });
      throw error;
    }
  }

  // Get user skill progression over time
  async getUserSkillProgression(userId, timeFrame = '90d') {
    try {
      const timeFilter = this.getTimeFilter(timeFrame);
      
      const result = await query(
        `SELECT 
          DATE(start_time) as practice_date,
          AVG(overall_accuracy) as daily_accuracy,
          AVG(duration_seconds) as daily_duration,
          COUNT(*) as daily_sessions,
          MAX(overall_accuracy) as daily_best
        FROM practice_sessions 
        WHERE user_id = $1 AND end_time IS NOT NULL AND start_time >= ${timeFilter}
        GROUP BY DATE(start_time)
        ORDER BY practice_date DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user skill progression', { userId, error: error.message });
      throw error;
    }
  }

  // Get technique mastery data
  async getTechniqueMastery(userId) {
    try {
      const result = await query(
        `SELECT 
          unnest(focus_techniques) as technique,
          COUNT(*) as sessions_practiced,
          AVG(overall_accuracy) as avg_accuracy,
          MAX(overall_accuracy) as best_accuracy,
          SUM(duration_seconds) as total_time,
          MIN(start_time) as first_practiced,
          MAX(start_time) as last_practiced
        FROM practice_sessions 
        WHERE user_id = $1 AND focus_techniques IS NOT NULL AND end_time IS NOT NULL
        GROUP BY unnest(focus_techniques)
        ORDER BY total_time DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get technique mastery', { userId, error: error.message });
      throw error;
    }
  }

  // Get recent mistakes and improvement areas
  async getRecentMistakes(userId, limit = 50) {
    try {
      const result = await query(
        `SELECT 
          mistakes,
          improvement_areas,
          overall_accuracy,
          session_type,
          start_time,
          song_id
        FROM practice_sessions 
        WHERE user_id = $1 AND mistakes IS NOT NULL AND end_time IS NOT NULL
        ORDER BY start_time DESC
        LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get recent mistakes', { userId, error: error.message });
      throw error;
    }
  }

  // Add practice analysis data (real-time feedback)
  async addPracticeAnalysis(sessionId, analysisData) {
    const {
      timestamp,
      current_chord,
      accuracy,
      mistake_detected,
      encouragement,
      pitch_data,
      timing_data
    } = analysisData;

    try {
      const result = await query(
        `INSERT INTO practice_analysis (
          session_id, timestamp, current_chord, accuracy, 
          mistake_detected, encouragement, pitch_data, timing_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [sessionId, timestamp, current_chord, accuracy,
         mistake_detected, encouragement, pitch_data, timing_data]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to add practice analysis', { sessionId, error: error.message });
      throw error;
    }
  }

  // Get practice analysis for a session
  async getPracticeAnalysis(sessionId) {
    try {
      const result = await query(
        `SELECT * FROM practice_analysis 
        WHERE session_id = $1 
        ORDER BY timestamp ASC`,
        [sessionId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get practice analysis', { sessionId, error: error.message });
      throw error;
    }
  }

  // Update user statistics after practice
  async updateUserStats(userId, sessionData) {
    try {
      // This would be called after ending a session
      // Update user's total practice time, songs learned, streaks, etc.
      
      const practiceTime = sessionData.duration_seconds || 0;
      
      await query(
        `UPDATE users SET 
          total_practice_time = total_practice_time + $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2`,
        [practiceTime, userId]
      );

      // Update streak logic would go here
      // This would check if the user practiced today and update consecutive days

    } catch (error) {
      logger.error('Failed to update user stats', { userId, error: error.message });
      throw error;
    }
  }

  // Get practice recommendations
  async getPracticeRecommendations(userId) {
    try {
      // Get user's current skill level and recent practice data
      const userResult = await query(
        'SELECT skill_level, preferred_genres FROM users WHERE user_id = $1',
        [userId]
      );

      const user = userResult.rows[0];
      if (!user) return [];

      // Get recent mistakes and weak areas
      const mistakesResult = await query(
        `SELECT 
          jsonb_array_elements_text(improvement_areas) as improvement_area,
          COUNT(*) as frequency
        FROM practice_sessions 
        WHERE user_id = $1 AND improvement_areas IS NOT NULL 
          AND start_time > NOW() - INTERVAL '30 days'
        GROUP BY improvement_area
        ORDER BY frequency DESC
        LIMIT 5`,
        [userId]
      );

      // Get techniques that need improvement
      const techniqueResult = await query(
        `SELECT 
          technique,
          avg_accuracy,
          sessions_practiced
        FROM get_technique_mastery($1)
        ORDER BY avg_accuracy ASC
        LIMIT 3`,
        [userId]
      );

      // Generate recommendations based on the data
      const recommendations = [];

      // Add technique recommendations
      techniqueResult.rows.forEach(row => {
        recommendations.push({
          type: 'technique',
          title: `Improve ${row.technique}`,
          description: `Your average accuracy is ${Math.round(row.avg_accuracy)}%. Focus on this technique.`,
          priority: 'high',
          estimated_time: 15
        });
      });

      // Add improvement area recommendations
      mistakesResult.rows.forEach(row => {
        recommendations.push({
          type: 'improvement',
          title: `Work on ${row.improvement_area}`,
          description: `This has been identified as an area needing improvement ${row.frequency} times recently.`,
          priority: 'medium',
          estimated_time: 10
        });
      });

      return recommendations.slice(0, 8); // Return top 8 recommendations
    } catch (error) {
      logger.error('Failed to get practice recommendations', { userId, error: error.message });
      throw error;
    }
  }

  // Helper function to get time filter SQL
  getTimeFilter(timeFrame) {
    switch (timeFrame) {
      case '7d':
        return "NOW() - INTERVAL '7 days'";
      case '30d':
        return "NOW() - INTERVAL '30 days'";
      case '90d':
        return "NOW() - INTERVAL '90 days'";
      case '1y':
        return "NOW() - INTERVAL '1 year'";
      default:
        return "NOW() - INTERVAL '30 days'";
    }
  }
}

module.exports = new PracticeService();