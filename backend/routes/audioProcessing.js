const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const audioProcessingService = require('../services/audioProcessing');
const songService = require('../services/songService');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const logger = require('../config/logger');

// Process YouTube URL
router.post('/process-youtube', 
  authMiddleware.authenticate(),
  validationMiddleware.validateYouTubeProcessing,
  async (req, res) => {
    try {
      const { youtube_url, user_preferences } = req.body;

      // Check if song already exists
      const existingSong = await audioProcessingService.extractVideoId(youtube_url);
      if (existingSong) {
        const song = await songService.getSongByYouTubeId(existingSong);
        if (song && song.processing_status === 'completed') {
          return res.json({
            job_id: `existing_${song.song_id}`,
            status: 'completed',
            message: 'Song already processed',
            results: {
              song_id: song.song_id,
              metadata: {
                title: song.title,
                artist: song.artist,
                duration: song.duration_seconds,
                original_key: song.original_key,
                tempo_bpm: song.tempo_bpm,
                overall_difficulty: song.overall_difficulty
              },
              chords: song.chord_progression,
              processing_completed: true
            }
          });
        }
      }

      // Process the YouTube URL
      const results = await audioProcessingService.processYouTubeUrl(youtube_url, user_preferences);

      // Create song entry in database
      if (results.status === 'completed') {
        const songData = {
          youtube_id: audioProcessingService.extractVideoId(youtube_url),
          title: results.metadata.title,
          artist: results.metadata.artist,
          duration_seconds: results.metadata.duration,
          original_key: results.key,
          tempo_bpm: results.tempo.bpm,
          chord_progression: results.chords,
          overall_difficulty: results.analysis.difficulty || 3,
          thumbnail_url: results.metadata.thumbnail
        };

        await songService.createSong(songData);
      }

      res.json(results);
    } catch (error) {
      logger.error('YouTube processing failed', { error: error.message, youtube_url: req.body.youtube_url });
      res.status(500).json({
        error: 'Failed to process YouTube URL',
        code: 'PROCESSING_ERROR',
        message: error.message
      });
    }
  }
);

// Get processing status
router.get('/process-status/:jobId',
  authMiddleware.authenticate(),
  validationMiddleware.validateJobStatus,
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const status = await audioProcessingService.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({
          error: 'Job not found',
          code: 'JOB_NOT_FOUND'
        });
      }

      res.json(status);
    } catch (error) {
      logger.error('Failed to get processing status', { jobId: req.params.jobId, error: error.message });
      res.status(500).json({
        error: 'Failed to get processing status',
        code: 'STATUS_ERROR'
      });
    }
  }
);

// Get processed song results
router.get('/song-results/:jobId',
  authMiddleware.authenticate(),
  validationMiddleware.validateSongResults,
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const results = await audioProcessingService.getJobResults(jobId);

      if (!results) {
        return res.status(404).json({
          error: 'Results not found',
          code: 'RESULTS_NOT_FOUND'
        });
      }

      res.json(results);
    } catch (error) {
      logger.error('Failed to get song results', { jobId: req.params.jobId, error: error.message });
      res.status(500).json({
        error: 'Failed to get song results',
        code: 'RESULTS_ERROR'
      });
    }
  }
);

// Transpose song
router.post('/transpose',
  authMiddleware.authenticate(),
  validationMiddleware.validateTransposition,
  async (req, res) => {
    try {
      const { song_id, target_key, preserve_fingering } = req.body;

      const transposedData = await songService.transposeSong(song_id, target_key, preserve_fingering);

      res.json({
        success: true,
        transposed_data: transposedData
      });
    } catch (error) {
      logger.error('Song transposition failed', { song_id: req.body.song_id, error: error.message });
      res.status(500).json({
        error: 'Failed to transpose song',
        code: 'TRANSPOSITION_ERROR',
        message: error.message
      });
    }
  }
);

// Get technique guidance
router.get('/techniques/:songId/:timestamp',
  authMiddleware.authenticate(),
  validationMiddleware.validateTechniqueGuidance,
  async (req, res) => {
    try {
      const { songId, timestamp } = req.params;
      const time = parseFloat(timestamp);

      // Get song data
      const song = await songService.getSongById(songId);
      if (!song) {
        return res.status(404).json({
          error: 'Song not found',
          code: 'SONG_NOT_FOUND'
        });
      }

      // Find the current chord at this timestamp
      const currentChord = song.chord_progression?.find(chord => 
        time >= chord.start_time && time < chord.start_time + chord.duration
      );

      // Get technique guidance based on chord and song analysis
      const technique = await getTechniqueForContext(currentChord, song, time);

      res.json({
        technique: technique,
        context: {
          chord: currentChord?.chord || 'N/A',
          timestamp: time,
          song_key: song.original_key,
          difficulty: song.overall_difficulty
        }
      });
    } catch (error) {
      logger.error('Failed to get technique guidance', { 
        songId: req.params.songId, 
        timestamp: req.params.timestamp, 
        error: error.message 
      });
      res.status(500).json({
        error: 'Failed to get technique guidance',
        code: 'TECHNIQUE_ERROR'
      });
    }
  }
);

// Helper function to get technique based on context
async function getTechniqueForContext(chord, song, timestamp) {
  // This would integrate with the AI service and technique database
  // For now, return mock technique data
  
  const techniques = [
    {
      name: 'Basic Strumming',
      category: 'rhythm',
      difficulty: 1,
      description: 'Fundamental down-up strumming pattern',
      instructions: [
        'Keep wrist relaxed',
        'Use consistent motion',
        'Start with downstrokes only'
      ],
      common_mistakes: [
        'Too much arm movement',
        'Inconsistent timing'
      ],
      tips: ['Practice with metronome', 'Start slowly']
    },
    {
      name: 'Chord Transition',
      category: 'rhythm',
      difficulty: 2,
      description: 'Smoothly change between chords',
      instructions: [
        'Move fingers together',
        'Keep fingers close to fretboard',
        'Anticipate next chord shape'
      ],
      common_mistakes: [
        'Lifting fingers too high',
        'Not anticipating changes'
      ],
      tips: ['Practice chord shapes separately', 'Use a metronome']
    }
  ];

  // Select technique based on context
  const difficulty = song.overall_difficulty || 3;
  const selectedIndex = difficulty <= 3 ? 0 : 1;
  
  return techniques[selectedIndex];
}

module.exports = router;