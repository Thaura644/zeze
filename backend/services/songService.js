const express = require('express');
const { query } = require('../config/database');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

class SongService {
  // Create a new song entry
  async createSong(songData) {
    const {
      youtube_id,
      spotify_id,
      title,
      artist,
      album,
      release_year,
      duration_seconds,
      original_key,
      tempo_bpm,
      time_signature,
      energy_level,
      valence,
      chord_progression,
      note_sequence,
      beat_grid,
      sections,
      techniques_identified,
      overall_difficulty,
      chord_difficulty,
      solo_difficulty,
      rhythm_difficulty,
      speed_difficulty,
      original_audio_url,
      processed_audio_url,
      waveform_data,
      thumbnail_url
    } = songData;

    try {
      const result = await query(
        `INSERT INTO songs (
          youtube_id, spotify_id, title, artist, album, release_year, duration_seconds,
          original_key, tempo_bpm, time_signature, energy_level, valence,
          chord_progression, note_sequence, beat_grid, sections, techniques_identified,
          overall_difficulty, chord_difficulty, solo_difficulty, rhythm_difficulty,
          speed_difficulty, original_audio_url, processed_audio_url, waveform_data,
          thumbnail_url, processing_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21, $22, $23, $24, $25, $26, 'completed')
        RETURNING *`,
        [youtube_id, spotify_id, title, artist, album, release_year, duration_seconds,
         original_key, tempo_bpm, time_signature, energy_level, valence,
         chord_progression, note_sequence, beat_grid, sections, techniques_identified,
         overall_difficulty, chord_difficulty, solo_difficulty, rhythm_difficulty,
         speed_difficulty, original_audio_url, processed_audio_url, waveform_data,
         thumbnail_url]
      );

      logger.info(`New song created: ${title} by ${artist}`);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint.includes('youtube_id')) {
          throw new Error('Song with this YouTube ID already exists');
        }
      }
      logger.error('Failed to create song', { title, artist, error: error.message });
      throw error;
    }
  }

  // Get song by ID
  async getSongById(songId) {
    try {
      const result = await query(
        'SELECT * FROM songs WHERE song_id = $1',
        [songId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get song by ID', { songId, error: error.message });
      throw error;
    }
  }

  // Get song by YouTube ID
  async getSongByYouTubeId(youtubeId) {
    try {
      const result = await query(
        'SELECT * FROM songs WHERE youtube_id = $1',
        [youtubeId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get song by YouTube ID', { youtubeId, error: error.message });
      throw error;
    }
  }

  // Search songs
  async searchSongs(searchOptions) {
    const {
      query: searchQuery,
      artist,
      genre,
      difficulty_min,
      difficulty_max,
      key_filter,
      tempo_min,
      tempo_max,
      limit = 20,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = searchOptions;

    try {
      let queryText = `
        SELECT song_id, title, artist, album, duration_seconds, original_key, 
               tempo_bpm, overall_difficulty, processing_status, thumbnail_url,
               created_at, popularity_score
        FROM songs WHERE processing_status = 'completed'
      `;
      const queryParams = [];
      let paramIndex = 1;

      if (searchQuery) {
        queryText += ` AND (title ILIKE $${paramIndex} OR artist ILIKE $${paramIndex} OR album ILIKE $${paramIndex})`;
        queryParams.push(`%${searchQuery}%`);
        paramIndex++;
      }

      if (artist) {
        queryText += ` AND artist ILIKE $${paramIndex}`;
        queryParams.push(`%${artist}%`);
        paramIndex++;
      }

      if (difficulty_min !== undefined) {
        queryText += ` AND overall_difficulty >= $${paramIndex}`;
        queryParams.push(difficulty_min);
        paramIndex++;
      }

      if (difficulty_max !== undefined) {
        queryText += ` AND overall_difficulty <= $${paramIndex}`;
        queryParams.push(difficulty_max);
        paramIndex++;
      }

      if (key_filter) {
        queryText += ` AND original_key = $${paramIndex}`;
        queryParams.push(key_filter);
        paramIndex++;
      }

      if (tempo_min !== undefined) {
        queryText += ` AND tempo_bpm >= $${paramIndex}`;
        queryParams.push(tempo_min);
        paramIndex++;
      }

      if (tempo_max !== undefined) {
        queryText += ` AND tempo_bpm <= $${paramIndex}`;
        queryParams.push(tempo_max);
        paramIndex++;
      }

      queryText += ` ORDER BY ${sort_by} ${sort_order}`;
      queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      logger.error('Failed to search songs', { searchOptions, error: error.message });
      throw error;
    }
  }

  // Get popular songs
  async getPopularSongs(limit = 20) {
    try {
      const result = await query(
        `SELECT song_id, title, artist, album, duration_seconds, original_key,
                tempo_bpm, overall_difficulty, thumbnail_url, popularity_score
        FROM songs 
        WHERE processing_status = 'completed' AND popularity_score > 0
        ORDER BY popularity_score DESC
        LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get popular songs', { error: error.message });
      throw error;
    }
  }

  // Get recommended songs for user
  async getRecommendedSongs(userId, limit = 10) {
    try {
      // Get user's skill level and preferences
      const userResult = await query(
        'SELECT skill_level, preferred_genres FROM users WHERE user_id = $1',
        [userId]
      );

      const user = userResult.rows[0];
      if (!user) return [];

      // Get songs that match user's skill level and preferences
      const result = await query(
        `SELECT DISTINCT s.song_id, s.title, s.artist, s.album, s.duration_seconds,
                s.original_key, s.tempo_bpm, s.overall_difficulty, s.thumbnail_url,
                s.popularity_score,
                -- Calculate a recommendation score
                (CASE 
                  WHEN ABS(s.overall_difficulty - $2) <= 1 THEN 3
                  WHEN ABS(s.overall_difficulty - $2) <= 2 THEN 2
                  ELSE 1
                END * s.popularity_score) as recommendation_score
        FROM songs s
        LEFT JOIN user_songs us ON s.song_id = us.song_id AND us.user_id = $1
        WHERE s.processing_status = 'completed' 
          AND us.song_id IS NULL  -- User hasn't saved this song
          AND s.overall_difficulty BETWEEN ($2 - 2) AND ($2 + 2)
        ORDER BY recommendation_score DESC
        LIMIT $3`,
        [userId, user.skill_level, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get recommended songs', { userId, error: error.message });
      throw error;
    }
  }

  // Update song processing status
  async updateProcessingStatus(songId, status, progress = null, errors = null) {
    try {
      let updateText = 'UPDATE songs SET processing_status = $2';
      const params = [songId, status];
      let paramIndex = 3;

      if (progress !== null) {
        updateText += `, processing_progress = $${paramIndex}`;
        params.push(progress);
        paramIndex++;
      }

      if (errors) {
        updateText += `, processing_errors = $${paramIndex}`;
        params.push(errors);
        paramIndex++;
      }

      if (status === 'completed') {
        updateText += `, processed_at = CURRENT_TIMESTAMP`;
      }

      updateText += ' WHERE song_id = $1 RETURNING *';

      const result = await query(updateText, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update processing status', { songId, status, error: error.message });
      throw error;
    }
  }

  // Save song to user's library
  async saveSongToLibrary(userId, songId) {
    try {
      const result = await query(
        `INSERT INTO user_songs (user_id, song_id, saved_at) 
        VALUES ($1, $2, NOW()) 
        ON CONFLICT (user_id, song_id) DO NOTHING
        RETURNING *`,
        [userId, songId]
      );

      if (result.rows.length > 0) {
        logger.info(`Song saved to library: userId=${userId}, songId=${songId}`);
      }

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to save song to library', { userId, songId, error: error.message });
      throw error;
    }
  }

  // Remove song from user's library
  async removeSongFromLibrary(userId, songId) {
    try {
      const result = await query(
        'DELETE FROM user_songs WHERE user_id = $1 AND song_id = $2 RETURNING *',
        [userId, songId]
      );

      if (result.rows.length > 0) {
        logger.info(`Song removed from library: userId=${userId}, songId=${songId}`);
      }

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to remove song from library', { userId, songId, error: error.message });
      throw error;
    }
  }

  // Get user's saved songs
  async getUserSavedSongs(userId, limit = 50, offset = 0) {
    try {
      const result = await query(
        `SELECT s.*, us.saved_at, us.last_practiced_at, us.practice_count
        FROM songs s
        INNER JOIN user_songs us ON s.song_id = us.song_id
        WHERE us.user_id = $1 AND s.processing_status = 'completed'
        ORDER BY us.saved_at DESC
        LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user saved songs', { userId, error: error.message });
      throw error;
    }
  }

  // Update song popularity score
  async updatePopularityScore(songId) {
    try {
      const result = await query(
        `UPDATE songs SET 
          popularity_score = (
            -- Calculate popularity based on saves, plays, and recent activity
            (SELECT COUNT(*) FROM user_songs WHERE song_id = $1) * 0.3 +
            (SELECT COUNT(*) FROM practice_sessions WHERE song_id = $1 AND start_time > NOW() - INTERVAL '30 days') * 0.5 +
            (SELECT COUNT(*) FROM practice_sessions WHERE song_id = $1 AND start_time > NOW() - INTERVAL '7 days') * 0.2
          ),
          last_accessed_at = CURRENT_TIMESTAMP
        WHERE song_id = $1
        RETURNING popularity_score`,
        [songId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update popularity score', { songId, error: error.message });
      throw error;
    }
  }

  // Get song statistics
  async getSongStats(songId) {
    try {
      const result = await query(
        `SELECT 
          s.*,
          COUNT(DISTINCT us.user_id) as total_saves,
          COUNT(DISTINCT ps.user_id) as unique_players,
          COUNT(ps.session_id) as total_practice_sessions,
          AVG(ps.overall_accuracy) as avg_user_accuracy,
          COUNT(DISTINCT ps.user_id) FILTER (WHERE ps.start_time > NOW() - INTERVAL '7 days') as recent_players
        FROM songs s
        LEFT JOIN user_songs us ON s.song_id = us.song_id
        LEFT JOIN practice_sessions ps ON s.song_id = ps.song_id
        WHERE s.song_id = $1
        GROUP BY s.song_id`,
        [songId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get song statistics', { songId, error: error.message });
      throw error;
    }
  }

  // Transpose song to different key
  async transposeSong(songId, targetKey, preserveFingering = true) {
    try {
      // Get original song data
      const song = await this.getSongById(songId);
      if (!song) {
        throw new Error('Song not found');
      }

      // This would integrate with the transposition engine
      // For now, return mock transposed data
      
      const transposition = {
        original_key: song.original_key,
        target_key: targetKey,
        capo_position: this.calculateCapoPosition(song.original_key, targetKey),
        chord_progression: this.transposeChords(song.chord_progression, song.original_key, targetKey),
        tablature: this.transposeTablature(song.tablature, song.original_key, targetKey, preserveFingering)
      };

      logger.info(`Song transposed: ${songId} from ${song.original_key} to ${targetKey}`);
      return transposition;
    } catch (error) {
      logger.error('Failed to transpose song', { songId, targetKey, error: error.message });
      throw error;
    }
  }

  // Helper methods for transposition
  calculateCapoPosition(originalKey, targetKey) {
    // Simplified capo calculation
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const originalIndex = keys.indexOf(originalKey.replace('m', ''));
    const targetIndex = keys.indexOf(targetKey.replace('m', ''));
    
    let capo = targetIndex - originalIndex;
    if (capo < 0) capo += 12;
    
    return capo <= 5 ? capo : 0; // Only use capo for 1-5 frets
  }

  transposeChords(chords, originalKey, targetKey) {
    // Mock chord transposition
    if (!chords || !Array.isArray(chords)) return [];
    
    const chordMap = {
      'C': 'G', 'D': 'A', 'E': 'B', 'G': 'D', 'A': 'E', 'B': 'F#',
      'Em': 'Bm', 'Am': 'Em', 'Dm': 'Am', 'Cm': 'Gm'
    };

    return chords.map(chord => ({
      ...chord,
      transposed_chord: chordMap[chord.chord] || chord.chord,
      fingering: chord.fingering // This would be recalculated based on transposition
    }));
  }

  transposeTablature(tablature, originalKey, targetKey, preserveFingering) {
    // Mock tablature transposition
    if (!tablature) return null;

    return {
      ...tablature,
      notes: tablature.notes?.map(note => ({
        ...note,
        fret: preserveFingering ? note.fret : Math.max(0, note.fret + 2) // Simple transposition
      }))
    };
  }
}

module.exports = new SongService();