const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, param, query } = require('express-validator');
const router = express.Router();
const audioProcessingService = require('../services/audioProcessing');
const songService = require('../services/songService');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const logger = require('../config/logger');

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    logger.debug(`Upload destination: ${uploadDir}`);

    // Ensure uploads directory exists
    require('fs').mkdirSync(uploadDir, { recursive: true });

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    logger.debug(`Generated filename: ${filename}`);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    logger.debug('File filter check', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });

    const filetypes = /mp3|wav|ogg|m4a|flac/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    logger.debug('File type validation', { extname, mimetype });

    if (mimetype && extname) {
      logger.debug('File accepted');
      return cb(null, true);
    } else {
      logger.warn('File rejected - invalid type', { extname, mimetype });
      cb(new Error('Only audio files (mp3, wav, ogg, m4a, flac) are allowed!'));
    }
  }
});

// Process Audio File Upload
router.post('/process-audio',
  authMiddleware.authenticate(),
  (req, res, next) => {
    logger.info('Authentication passed, processing upload middleware');
    next();
  },
  upload.single('audio_file'),
  async (req, res) => {
    try {
      logger.info('Audio upload request received', {
        userId: req.user?.id,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        mimeType: req.file?.mimetype
      });

      if (!req.file) {
        logger.warn('No audio file uploaded in request');
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      let userPreferences = {};
      try {
        userPreferences = req.body.user_preferences ? JSON.parse(req.body.user_preferences) : {};
      } catch (parseError) {
        logger.warn('Failed to parse user_preferences, using defaults', { error: parseError.message });
      }

      // Start processing
      logger.info('Starting audio processing', {
        filePath: req.file.path,
        originalName: req.file.originalname,
        userPreferences
      });

      const results = await audioProcessingService.processAudioFile(
        req.file.path,
        req.file.originalname,
        userPreferences
      );

      logger.info('Audio processing completed', {
        status: results.status,
        hasResults: !!results.results
      });

      // Create song entry in database (optional - don't fail if database is unavailable)
      if (results.status === 'completed') {
        try {
          const songData = {
            title: results.metadata?.title || 'Unknown Title',
            artist: results.metadata?.artist || 'Unknown Artist',
            duration_seconds: Math.round(results.metadata?.duration || 0),
            original_key: results.key?.key || '',
            tempo_bpm: results.tempo?.bpm || 0,
            chord_progression: results.chords || [],
            overall_difficulty: results.analysis?.difficulty || 3,
            processing_status: 'completed'
          };

          const song = await songService.createSong(songData);
          results.results = {
            song_id: song.song_id,
            metadata: results.metadata,
            chords: results.chords,
            tablature: results.tablature,
            tempo: results.tempo,
            key: results.key,
            processing_completed: true
          };
        } catch (dbError) {
          logger.warn('Failed to create song entry in database, returning results without DB storage', { 
            error: dbError.message 
          });
          // Still return the processing results even if DB storage fails
          results.results = {
            song_id: results.job_id,
            metadata: results.metadata,
            chords: results.chords,
            tablature: results.tablature,
            tempo: results.tempo,
            key: results.key,
            processing_completed: true,
            database_storage_failed: true
          };
        }
      }

      res.json(results);
    } catch (error) {
      logger.error('Audio processing failed', {
        error: error.message,
        stack: error.stack,
        errorCode: error.code,
        errorName: error.name
      });

      // Handle specific error types
      let statusCode = 500;
      let errorCode = 'PROCESSING_ERROR';
      let errorMessage = 'Failed to process audio file';

      if (error.message && error.message.includes('Only audio files')) {
        statusCode = 400;
        errorCode = 'INVALID_FILE_TYPE';
        errorMessage = error.message;
      } else if (error.message && error.message.includes('File too large')) {
        statusCode = 413;
        errorCode = 'FILE_TOO_LARGE';
        errorMessage = 'Audio file exceeds maximum size limit';
      } else if (error.message && error.message.includes('ENOENT')) {
        statusCode = 500;
        errorCode = 'FILE_NOT_FOUND';
        errorMessage = 'Uploaded file not found';
      } else if (error.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        errorCode = 'FILE_TOO_LARGE';
        errorMessage = 'File exceeds maximum size limit';
      }

      res.status(statusCode).json({
        error: errorMessage,
        code: errorCode,
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name,
          code: error.code
        } : undefined
      });
    }
  }
);

// Process YouTube URL
router.post('/process-youtube',
  authMiddleware.authenticate(),
  validationMiddleware.validateYouTubeProcessing,
  async (req, res) => {
    try {
      const { youtube_url, user_preferences } = req.body;

      logger.info('YouTube processing request received', {
        userId: req.user?.id,
        youtubeUrl: youtube_url,
        userPreferences: user_preferences
      });

      // Check if song already exists
      const videoId = audioProcessingService.extractVideoId(youtube_url);
      if (videoId) {
        try {
          const song = await songService.getSongByYouTubeId(videoId);
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
                  overall_difficulty: song.overall_difficulty,
                  video_url: youtube_url
                },
                chords: song.chord_progression,
                processing_completed: true
              }
            });
          }
        } catch (dbError) {
          logger.warn('Database lookup failed, continuing with processing', { error: dbError.message });
        }
      }

      // Process the YouTube URL
      const results = await audioProcessingService.processYouTubeUrl(youtube_url, user_preferences || {});

      // Create song entry in database (optional - don't fail if database is unavailable)
      if (results.status === 'completed') {
        try {
          const songData = {
            youtube_id: videoId,
            title: results.metadata?.title || 'Unknown Title',
            artist: results.metadata?.artist || 'Unknown Artist',
            duration_seconds: Math.round(results.metadata?.duration || 0),
            original_key: results.key?.key || '',
            tempo_bpm: results.tempo?.bpm || 0,
            chord_progression: results.chords || [],
            overall_difficulty: results.analysis?.difficulty || 3,
            thumbnail_url: results.metadata?.thumbnail,
            processing_status: 'completed'
          };

          const song = await songService.createSong(songData);
          results.results = {
            song_id: song.song_id,
            metadata: results.metadata,
            chords: results.chords,
            tablature: results.tablature,
            tempo: results.tempo,
            key: results.key,
            processing_completed: true
          };
        } catch (dbError) {
          logger.warn('Failed to save song to database, returning results without DB storage', { error: dbError.message });
          results.results = {
            song_id: results.job_id,
            metadata: results.metadata,
            chords: results.chords,
            tablature: results.tablature,
            tempo: results.tempo,
            key: results.key,
            processing_completed: true,
            database_storage_failed: true
          };
        }
      }

      res.json(results);
    } catch (error) {
      logger.error('YouTube processing failed', { 
        error: error.message, 
        youtube_url: req.body.youtube_url,
        stack: error.stack
      });
      
      res.status(500).json({
        error: 'Failed to process YouTube URL',
        code: 'PROCESSING_ERROR',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack
        } : undefined
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

  const difficulty = song.overall_difficulty || 3;
  const selectedIndex = difficulty <= 3 ? 0 : 1;
  return techniques[selectedIndex];
}

module.exports = router;
