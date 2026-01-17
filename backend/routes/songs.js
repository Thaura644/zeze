const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();
const songService = require('../services/songService');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const logger = require('../config/logger');

// Search songs
router.get('/search',
  authMiddleware.optionalAuthenticate(),
  [
    query('query')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be 1-100 characters'),
    
    query('artist')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Artist name must be less than 100 characters'),
    
    query('difficulty_min')
      .optional()
      .isFloat({ min: 0, max: 10 })
      .withMessage('Minimum difficulty must be between 0 and 10'),
    
    query('difficulty_max')
      .optional()
      .isFloat({ min: 0, max: 10 })
      .withMessage('Maximum difficulty must be between 0 and 10'),
    
    query('key_filter')
      .optional()
      .isLength({ min: 1, max: 5 })
      .withMessage('Key filter must be 1-5 characters'),
    
    query('tempo_min')
      .optional()
      .isInt({ min: 40, max: 200 })
      .withMessage('Minimum tempo must be between 40 and 200'),
    
    query('tempo_max')
      .optional()
      .isInt({ min: 40, max: 200 })
      .withMessage('Maximum tempo must be between 40 and 200'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const searchOptions = {
        query: req.query.query,
        artist: req.query.artist,
        difficulty_min: req.query.difficulty_min ? parseFloat(req.query.difficulty_min) : undefined,
        difficulty_max: req.query.difficulty_max ? parseFloat(req.query.difficulty_max) : undefined,
        key_filter: req.query.key_filter,
        tempo_min: req.query.tempo_min ? parseInt(req.query.tempo_min) : undefined,
        tempo_max: req.query.tempo_max ? parseInt(req.query.tempo_max) : undefined,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        sort_by: req.query.sort_by || 'created_at',
        sort_order: req.query.sort_order || 'DESC'
      };

      const songs = await songService.searchSongs(searchOptions);

      res.json({
        songs,
        search_criteria: searchOptions,
        pagination: {
          limit: searchOptions.limit,
          offset: searchOptions.offset,
          total: songs.length // Would need separate count query for actual total
        }
      });
    } catch (error) {
      logger.error('Song search failed', { 
        searchOptions: req.query, 
        userId: req.user?.id,
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to search songs',
        code: 'SEARCH_ERROR'
      });
    }
  }
);

// Get song by ID
router.get('/:songId',
  authMiddleware.optionalAuthenticate(),
  [
    param('songId')
      .isUUID()
      .withMessage('Valid song ID is required')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const { songId } = req.params;

      const song = await songService.getSongById(songId);
      if (!song) {
        return res.status(404).json({
          error: 'Song not found',
          code: 'SONG_NOT_FOUND'
        });
      }

      // Get song statistics
      const stats = await songService.getSongStats(songId);

      // Check if user has saved this song
      let isSaved = false;
      if (req.user) {
        const userSongs = await songService.getUserSavedSongs(req.user.id, 1000, 0);
        isSaved = userSongs.some(s => s.song_id === songId);
      }

      res.json({
        song: {
          song_id: song.song_id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          release_year: song.release_year,
          duration_seconds: song.duration_seconds,
          original_key: song.original_key,
          tempo_bpm: song.tempo_bpm,
          time_signature: song.time_signature,
          energy_level: song.energy_level,
          valence: song.valence,
          overall_difficulty: song.overall_difficulty,
          chord_difficulty: song.chord_difficulty,
          solo_difficulty: song.solo_difficulty,
          rhythm_difficulty: song.rhythm_difficulty,
          speed_difficulty: song.speed_difficulty,
          thumbnail_url: song.thumbnail_url,
          popularity_score: song.popularity_score,
          created_at: song.created_at,
          processed_at: song.processed_at
        },
        stats,
        is_saved: isSaved,
        // Include detailed data only if processing is complete
        chord_progression: song.chord_progression,
        note_sequence: song.note_sequence,
        beat_grid: song.beat_grid,
        sections: song.sections,
        techniques_identified: song.techniques_identified
      });
    } catch (error) {
      logger.error('Failed to get song', { 
        songId: req.params.songId, 
        userId: req.user?.id,
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to get song',
        code: 'SONG_ERROR'
      });
    }
  }
);

// Get popular songs
router.get('/popular/list',
  authMiddleware.optionalAuthenticate(),
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;

      const songs = await songService.getPopularSongs(limit);

      res.json({
        songs,
        pagination: {
          limit,
          total: songs.length
        }
      });
    } catch (error) {
      logger.error('Failed to get popular songs', { 
        userId: req.user?.id,
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to get popular songs',
        code: 'POPULAR_SONGS_ERROR'
      });
    }
  }
);

// Get recommended songs (requires authentication)
router.get('/recommended/list',
  authMiddleware.authenticate(),
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const songs = await songService.getRecommendedSongs(req.user.id, limit);

      res.json({
        songs,
        pagination: {
          limit,
          total: songs.length
        }
      });
    } catch (error) {
      logger.error('Failed to get recommended songs', { 
        userId: req.user.id,
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to get recommended songs',
        code: 'RECOMMENDED_SONGS_ERROR'
      });
    }
  }
);

// Save song to user's library
router.post('/:songId/save',
  authMiddleware.authenticate(),
  [
    param('songId')
      .isUUID()
      .withMessage('Valid song ID is required')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const { songId } = req.params;

      // Verify song exists
      const song = await songService.getSongById(songId);
      if (!song) {
        return res.status(404).json({
          error: 'Song not found',
          code: 'SONG_NOT_FOUND'
        });
      }

      // Save song to library
      const savedSong = await songService.saveSongToLibrary(req.user.id, songId);

      if (!savedSong) {
        return res.status(409).json({
          error: 'Song already saved',
          code: 'SONG_ALREADY_SAVED'
        });
      }

      // Update song popularity
      await songService.updatePopularityScore(songId);

      res.status(201).json({
        message: 'Song saved to library',
        saved_at: savedSong.saved_at
      });
    } catch (error) {
      logger.error('Failed to save song', { 
        songId: req.params.songId,
        userId: req.user.id,
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to save song',
        code: 'SAVE_SONG_ERROR'
      });
    }
  }
);

// Remove song from user's library
router.delete('/:songId/save',
  authMiddleware.authenticate(),
  [
    param('songId')
      .isUUID()
      .withMessage('Valid song ID is required')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const { songId } = req.params;

      // Remove song from library
      const removedSong = await songService.removeSongFromLibrary(req.user.id, songId);

      if (!removedSong) {
        return res.status(404).json({
          error: 'Song not found in library',
          code: 'SONG_NOT_SAVED'
        });
      }

      // Update song popularity
      await songService.updatePopularityScore(songId);

      res.json({
        message: 'Song removed from library'
      });
    } catch (error) {
      logger.error('Failed to remove song', { 
        songId: req.params.songId,
        userId: req.user.id,
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to remove song',
        code: 'REMOVE_SONG_ERROR'
      });
    }
  }
);

// Get user's saved songs
router.get('/saved/list',
  authMiddleware.authenticate(),
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
  ],
  validationMiddleware.handleValidationErrors,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const songs = await songService.getUserSavedSongs(req.user.id, limit, offset);

      res.json({
        songs,
        pagination: {
          limit,
          offset,
          total: songs.length // Would need separate count query for actual total
        }
      });
    } catch (error) {
      logger.error('Failed to get saved songs', { 
        userId: req.user.id,
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to get saved songs',
        code: 'SAVED_SONGS_ERROR'
      });
    }
  }
);

module.exports = router;