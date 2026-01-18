const ytdl = require('@distube/ytdl-core');
const ytDlpExec = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const logger = require('../config/logger');
const { cache } = require('../config/redis');

class AudioProcessingService {
  constructor() {
    this.supportedFormats = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
    this.maxFileSize = (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024; // Convert to bytes
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
  }

  // Extract YouTube video ID from URL
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Get YouTube video metadata using oEmbed API (no API key required)
  async getYouTubeMetadata(videoId) {
    try {
      // First try oEmbed API (most reliable, no API key needed)
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedResponse = await axios.get(oembedUrl, { timeout: 10000 });
        
        if (oembedResponse.data) {
          return {
            videoId,
            title: oembedResponse.data.title || 'Unknown Title',
            artist: oembedResponse.data.author_name || 'Unknown Artist',
            duration: 0, // oEmbed doesn't provide duration, will be extracted from audio
            thumbnail: oembedResponse.data.thumbnail_url,
            uploadDate: null,
            viewCount: 0,
            description: ''
          };
        }
      } catch (oembedError) {
        logger.warn('oEmbed API failed, trying YouTube Data API', { videoId, error: oembedError.message });
      }

      // Try YouTube Data API if available
      if (this.youtubeApiKey) {
        try {
          const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
              part: 'snippet,contentDetails,statistics',
              id: videoId,
              key: this.youtubeApiKey
            },
            timeout: 10000
          });

          if (response.data.items && response.data.items.length > 0) {
            const item = response.data.items[0];
            return {
              videoId,
              title: item.snippet.title,
              artist: item.snippet.channelTitle,
              duration: this.parseISO8601Duration(item.contentDetails.duration),
              thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
              uploadDate: item.snippet.publishedAt,
              viewCount: parseInt(item.statistics.viewCount),
              description: item.snippet.description
            };
          }
        } catch (apiError) {
          logger.warn('YouTube API metadata fetch failed', { videoId, error: apiError.message });
        }
      }

      // Fallback to @distube/ytdl-core
      try {
        const info = await ytdl.getInfo(videoId);
        return {
          videoId,
          title: info.videoDetails.title,
          artist: info.videoDetails.author.name,
          duration: parseInt(info.videoDetails.lengthSeconds),
          thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url,
          uploadDate: info.videoDetails.uploadDate,
          viewCount: parseInt(info.videoDetails.viewCount),
          description: info.videoDetails.description
        };
      } catch (ytdlError) {
        logger.warn('ytdl-core metadata fetch failed', { videoId, error: ytdlError.message });
      }

      // Final fallback - return basic metadata
      return {
        videoId,
        title: `YouTube Video ${videoId}`,
        artist: 'Unknown Artist',
        duration: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        uploadDate: null,
        viewCount: 0,
        description: ''
      };
    } catch (error) {
      logger.error('Failed to get YouTube metadata', { videoId, error: error.message });
      throw new Error('Failed to retrieve video metadata');
    }
  }

  parseISO8601Duration(duration) {
    if (!duration) return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Download audio from YouTube using multiple methods
  async downloadYouTubeAudio(videoId, outputPath) {
    const errors = [];

    // Method 1: Try @distube/ytdl-core first (most compatible)
    try {
      logger.info('Attempting download with @distube/ytdl-core', { videoId });
      await this.downloadWithYtdlCore(videoId, outputPath);
      logger.info('Successfully downloaded with @distube/ytdl-core', { videoId });
      return outputPath;
    } catch (ytdlError) {
      errors.push({ method: 'ytdl-core', error: ytdlError.message });
      logger.warn('ytdl-core download failed', { videoId, error: ytdlError.message });
    }

    // Method 2: Try yt-dlp (more reliable but requires binary)
    try {
      logger.info('Attempting download with yt-dlp', { videoId });
      await this.downloadWithYtDlp(videoId, outputPath);
      logger.info('Successfully downloaded with yt-dlp', { videoId });
      return outputPath;
    } catch (ytDlpError) {
      errors.push({ method: 'yt-dlp', error: ytDlpError.message });
      logger.warn('yt-dlp download failed', { videoId, error: ytDlpError.message });
    }

    // All methods failed
    const errorMessage = `All download methods failed: ${errors.map(e => `${e.method}: ${e.error}`).join('; ')}`;
    logger.error('YouTube download failed completely', { videoId, errors });
    throw new Error(errorMessage);
  }

  async downloadWithYtdlCore(videoId, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const stream = ytdl(videoId, {
          quality: 'highestaudio',
          filter: 'audioonly'
        });

        const writeStream = require('fs').createWriteStream(outputPath);

        stream.on('error', (err) => {
          logger.error('ytdl stream error', { videoId, error: err.message });
          reject(err);
        });

        writeStream.on('error', (err) => {
          logger.error('writeStream error', { videoId, error: err.message });
          reject(err);
        });

        stream.pipe(writeStream);

        writeStream.on('finish', () => {
          logger.info(`YouTube audio downloaded with ytdl-core: ${videoId}`);
          resolve(outputPath);
        });
      } catch (error) {
        logger.error('Failed to initialize ytdl stream', { videoId, error: error.message });
        reject(error);
      }
    });
  }

  async downloadWithYtDlp(videoId, outputPath) {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      
      await ytDlpExec(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0, // Best quality
        output: outputPath,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      });

      logger.info(`YouTube audio downloaded with yt-dlp: ${videoId}`);
      return outputPath;
    } catch (error) {
      logger.error('yt-dlp download failed', { videoId, error: error.message });
      throw error;
    }
  }

  // Convert audio to WAV format for processing
  async convertToWav(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        logger.info(`Starting ffmpeg conversion: ${inputPath} -> ${outputPath}`);

        ffmpeg(inputPath)
          .toFormat('wav')
          .audioCodec('pcm_s16le')
          .audioFrequency(44100)
          .audioChannels(1) // Convert to mono for better analysis
          .on('start', (commandLine) => {
            logger.debug('FFmpeg command: ' + commandLine);
          })
          .on('progress', (progress) => {
            logger.debug('FFmpeg progress: ' + progress.percent + '% done');
          })
          .on('end', () => {
            logger.info(`Audio converted to WAV: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (error) => {
            logger.error('Audio conversion failed', {
              inputPath,
              outputPath,
              error: error.message,
              stack: error.stack
            });
            reject(new Error(`FFmpeg conversion failed: ${error.message}`));
          })
          .save(outputPath);
      } catch (error) {
        logger.error('Failed to initialize ffmpeg', {
          inputPath,
          outputPath,
          error: error.message,
          stack: error.stack
        });
        reject(new Error(`FFmpeg initialization failed: ${error.message}`));
      }
    });
  }

  // Extract 30-second sample from audio
  async extractAudioSample(inputPath, outputPath, startTime = 30) {
    return new Promise((resolve, reject) => {
      try {
        ffmpeg(inputPath)
          .seekInput(startTime)
          .duration(30) // Extract 30 seconds
          .on('end', () => {
            logger.info(`30-second sample extracted: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (error) => {
            logger.error('Sample extraction failed', { inputPath, error: error.message });
            reject(error);
          })
          .save(outputPath);
      } catch (error) {
        logger.error('Failed to initialize ffmpeg for sample extraction', { inputPath, error: error.message });
        reject(error);
      }
    });
  }

  // Process a generic audio file
  async processAudioFile(filePath, originalName, userPreferences = {}) {
    const jobId = uuidv4();
    let tempDir = null;
    try {
      logger.info(`Starting audio processing job ${jobId}`, {
        filePath,
        originalName,
        userPreferences
      });

      await this.updateJobProgress(jobId, 'initialization', 5);

      tempDir = path.join(process.cwd(), 'temp', jobId);
      logger.info(`Creating temp directory: ${tempDir}`);
      await fs.mkdir(tempDir, { recursive: true });

      const metadata = {
        title: path.parse(originalName).name,
        artist: 'Unknown Artist',
        duration: 0, // Will be updated
      };

      // Get duration
      logger.info('Getting audio duration...');
      metadata.duration = await this.getAudioDuration(filePath);

      await this.updateJobProgress(jobId, 'audio_conversion', 20);
      const wavPath = path.join(tempDir, 'audio.wav');
      logger.info(`Converting to WAV: ${wavPath}`);
      await this.convertToWav(filePath, wavPath);

      return await this.runProcessingPipeline(jobId, wavPath, metadata, userPreferences, tempDir);
    } catch (error) {
      logger.error('Audio file processing failed', {
        jobId,
        error: error.message,
        stack: error.stack,
        tempDir,
        filePath,
        originalName
      });
      await this.updateJobProgress(jobId, 'error', null, error.message);

      // Clean up temp directory if it was created
      if (tempDir) {
        try {
          await this.cleanup(tempDir);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup temp directory', { tempDir, cleanupError: cleanupError.message });
        }
      }

      throw error;
    }
  }

  async getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
      try {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) return reject(err);
          resolve(metadata.format.duration);
        });
      } catch (error) {
        logger.error('Failed to get audio duration', { filePath, error: error.message });
        reject(error);
      }
    });
  }

  // Process YouTube URL completely
  async processYouTubeUrl(youtubeUrl, userPreferences = {}) {
    const jobId = uuidv4();
    let tempDir = null;
    
    try {
      await this.updateJobProgress(jobId, 'download', 0);

      const videoId = this.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL format');
      }

      await this.updateJobProgress(jobId, 'metadata_extraction', 10);
      const metadata = await this.getYouTubeMetadata(videoId);
      metadata.video_url = youtubeUrl;

      tempDir = path.join(process.cwd(), 'temp', jobId);
      await fs.mkdir(tempDir, { recursive: true });

      const rawAudioPath = path.join(tempDir, 'raw.audio');
      
      // Download audio
      await this.updateJobProgress(jobId, 'downloading_audio', 20);
      await this.downloadYouTubeAudio(videoId, rawAudioPath);

      await this.updateJobProgress(jobId, 'audio_conversion', 40);
      const wavPath = path.join(tempDir, 'audio.wav');
      await this.convertToWav(rawAudioPath, wavPath);

      // Update duration from actual audio file
      metadata.duration = await this.getAudioDuration(wavPath);

      return await this.runProcessingPipeline(jobId, wavPath, metadata, userPreferences, tempDir);
    } catch (error) {
      logger.error('YouTube processing failed', { jobId, error: error.message });
      await this.updateJobProgress(jobId, 'error', null, error.message);
      
      // Clean up temp directory
      if (tempDir) {
        try {
          await this.cleanup(tempDir);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup temp directory', { tempDir, cleanupError: cleanupError.message });
        }
      }
      
      throw error;
    }
  }

  async runProcessingPipeline(jobId, wavPath, metadata, userPreferences, tempDir) {
    try {
      await this.updateJobProgress(jobId, 'sample_extraction', 50);
      const samplePath = path.join(tempDir, 'sample.wav');
      const sampleStartTime = Math.min(30, Math.floor(metadata.duration / 2));
      await this.extractAudioSample(wavPath, samplePath, sampleStartTime);

      await this.updateJobProgress(jobId, 'audio_analysis', 60);
      const analysis = await this.analyzeAudio(samplePath, metadata);

      await this.updateJobProgress(jobId, 'chord_detection', 75);
      const chords = await this.detectChords(samplePath, analysis);

      await this.updateJobProgress(jobId, 'tempo_detection', 85);
      const tempo = await this.detectTempo(samplePath);

      await this.updateJobProgress(jobId, 'key_detection', 90);
      const key = await this.detectKey(samplePath);

      await this.updateJobProgress(jobId, 'tab_generation', 95);
      const tablature = await this.generateTablature(chords, analysis);

      await this.updateJobProgress(jobId, 'completion', 100);

      await this.cleanup(tempDir);

      const results = {
        job_id: jobId,
        status: 'completed',
        metadata,
        analysis,
        chords,
        tempo,
        key,
        tablature,
        processed_at: new Date().toISOString(),
        user_preferences: userPreferences
      };

      try {
        await cache.set(`job_${jobId}`, results, 3600);
      } catch (cacheError) {
        logger.warn('Failed to cache processing results, returning results without caching', {
          jobId,
          cacheError: cacheError.message
        });
      }

      return results;
    } catch (error) {
      await this.cleanup(tempDir);
      throw error;
    }
  }

  // Estimate remaining time based on current step
  estimateRemainingTime(currentStep) {
    const timeEstimates = {
      'initialization': 5,
      'audio_conversion': 15,
      'sample_extraction': 10,
      'audio_analysis': 20,
      'chord_detection': 15,
      'tempo_detection': 10,
      'key_detection': 10,
      'tab_generation': 5,
      'completion': 0,
      'error': 0
    };

    return timeEstimates[currentStep] || 30; // Default 30 seconds
  }

  // Update job progress in cache (optional - don't fail if Redis is down)
  async updateJobProgress(jobId, currentStep, progressPercentage, error = null) {
    const jobStatus = {
      job_id: jobId,
      status: error ? 'error' : 'processing',
      progress_percentage: progressPercentage,
      current_step: currentStep,
      estimated_remaining_seconds: this.estimateRemainingTime(currentStep),
      error: error,
      updated_at: new Date().toISOString()
    };

    try {
      await cache.set(`job_status_${jobId}`, jobStatus, 3600);
    } catch (cacheError) {
      logger.warn('Failed to update job progress in cache, continuing without caching', {
        jobId,
        cacheError: cacheError.message
      });
    }

    return jobStatus;
  }

  async getJobStatus(jobId) {
    try {
      return await cache.get(`job_status_${jobId}`);
    } catch (cacheError) {
      logger.warn('Failed to get job status from cache, returning null', {
        jobId,
        cacheError: cacheError.message
      });
      return null;
    }
  }

  async getJobResults(jobId) {
    try {
      return await cache.get(`job_${jobId}`);
    } catch (cacheError) {
      logger.warn('Failed to get job results from cache, returning null', {
        jobId,
        cacheError: cacheError.message
      });
      return null;
    }
  }

  // Audio analysis using actual audio processing
  async analyzeAudio(audioPath, metadata) {
    logger.info(`Analyzing audio: ${audioPath}`);
    
    // Get actual audio properties using ffprobe
    const audioInfo = await this.getAudioInfo(audioPath);
    
    return {
      duration: metadata.duration || audioInfo.duration,
      sample_rate: audioInfo.sample_rate || 44100,
      bit_depth: audioInfo.bit_depth || 16,
      channels: audioInfo.channels || 1,
      rms_level: audioInfo.rms_level || 0,
      zero_crossing_rate: 0,
      spectral_centroid: 0,
      spectral_rolloff: 0,
      mfcc: [],
      onset_times: [],
      beat_times: [],
      sections: [],
      difficulty: this.estimateDifficulty(metadata)
    };
  }

  async getAudioInfo(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          logger.warn('Failed to get audio info', { audioPath, error: err.message });
          resolve({
            duration: 0,
            sample_rate: 44100,
            bit_depth: 16,
            channels: 1,
            rms_level: 0
          });
          return;
        }
        
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        resolve({
          duration: metadata.format.duration || 0,
          sample_rate: audioStream?.sample_rate || 44100,
          bit_depth: audioStream?.bits_per_sample || 16,
          channels: audioStream?.channels || 1,
          rms_level: 0
        });
      });
    });
  }

  estimateDifficulty(metadata) {
    // Estimate difficulty based on song duration and other factors
    // Longer songs tend to be more complex
    const duration = metadata.duration || 180;
    if (duration < 120) return 2; // Short songs - easier
    if (duration < 240) return 3; // Medium length
    if (duration < 360) return 4; // Longer songs
    return 5; // Very long songs
  }

  // Chord detection - uses audio analysis
  async detectChords(audioPath, analysis) {
    logger.info(`Detecting chords in: ${audioPath}`);
    
    // For now, return empty array - real chord detection requires ML models
    // This should be replaced with actual chord detection using libraries like:
    // - Essentia.js
    // - Meyda
    // - Or a custom ML model
    
    // Return empty array - the frontend should handle this gracefully
    return [];
  }

  // Tempo detection using music-tempo library
  async detectTempo(audioPath) {
    logger.info(`Detecting tempo in: ${audioPath}`);
    
    try {
      // Try to use music-tempo library
      const MusicTempo = require('music-tempo');
      const audioData = await this.getAudioData(audioPath);
      
      if (audioData && audioData.length > 0) {
        const mt = new MusicTempo(audioData);
        return {
          bpm: Math.round(mt.tempo),
          confidence: mt.confidence || 0.5,
          time_signature: '4/4'
        };
      }
    } catch (error) {
      logger.warn('Tempo detection failed', { audioPath, error: error.message });
    }
    
    // Return default tempo if detection fails
    return {
      bpm: 120,
      confidence: 0,
      time_signature: '4/4'
    };
  }

  async getAudioData(audioPath) {
    // This would need to read the WAV file and return audio samples
    // For now, return null to trigger fallback
    return null;
  }

  // Key detection
  async detectKey(audioPath) {
    logger.info(`Detecting key in: ${audioPath}`);
    
    // Key detection requires spectral analysis
    // Return empty result - should be implemented with proper audio analysis
    return {
      key: '',
      scale: '',
      confidence: 0,
      related_keys: []
    };
  }

  // Generate tablature from chords
  async generateTablature(chords, analysis) {
    logger.info('Generating tablature');
    
    // Generate tablature based on detected chords
    const tablature = {
      tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
      capo: 0,
      notes: []
    };

    // Convert chords to tab notes
    if (chords && chords.length > 0) {
      chords.forEach(chord => {
        const positions = this.getChordPositions(chord.chord);
        positions.forEach(pos => {
          tablature.notes.push({
            string: pos.string,
            fret: pos.fret,
            time: chord.start_time,
            duration: chord.duration,
            chord: chord.chord
          });
        });
      });
    }

    return tablature;
  }

  // Get finger positions for common chords
  getChordPositions(chordName) {
    const chordShapes = {
      'C': [{ string: 1, fret: 0 }, { string: 2, fret: 1 }, { string: 3, fret: 0 }, { string: 4, fret: 2 }, { string: 5, fret: 3 }],
      'G': [{ string: 0, fret: 3 }, { string: 1, fret: 0 }, { string: 2, fret: 0 }, { string: 3, fret: 0 }, { string: 4, fret: 2 }, { string: 5, fret: 3 }],
      'D': [{ string: 0, fret: 2 }, { string: 1, fret: 3 }, { string: 2, fret: 2 }, { string: 3, fret: 0 }],
      'A': [{ string: 1, fret: 0 }, { string: 2, fret: 2 }, { string: 3, fret: 2 }, { string: 4, fret: 2 }],
      'E': [{ string: 0, fret: 0 }, { string: 1, fret: 0 }, { string: 2, fret: 1 }, { string: 3, fret: 2 }, { string: 4, fret: 2 }, { string: 5, fret: 0 }],
      'Am': [{ string: 0, fret: 0 }, { string: 1, fret: 1 }, { string: 2, fret: 2 }, { string: 3, fret: 2 }, { string: 4, fret: 0 }],
      'Em': [{ string: 0, fret: 0 }, { string: 1, fret: 0 }, { string: 2, fret: 0 }, { string: 3, fret: 2 }, { string: 4, fret: 2 }, { string: 5, fret: 0 }],
      'Dm': [{ string: 0, fret: 1 }, { string: 1, fret: 3 }, { string: 2, fret: 2 }, { string: 3, fret: 0 }],
      'F': [{ string: 0, fret: 1 }, { string: 1, fret: 1 }, { string: 2, fret: 2 }, { string: 3, fret: 3 }, { string: 4, fret: 3 }, { string: 5, fret: 1 }],
      'B': [{ string: 0, fret: 2 }, { string: 1, fret: 4 }, { string: 2, fret: 4 }, { string: 3, fret: 4 }, { string: 4, fret: 2 }],
      'Bm': [{ string: 0, fret: 2 }, { string: 1, fret: 3 }, { string: 2, fret: 4 }, { string: 3, fret: 4 }, { string: 4, fret: 2 }]
    };

    return chordShapes[chordName] || [];
  }

  // Cleanup temporary files
  async cleanup(tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      logger.info(`Cleaned up temp directory: ${tempDir}`);
    } catch (error) {
      logger.warn('Failed to cleanup temp directory', { tempDir, error: error.message });
    }
  }
}

module.exports = new AudioProcessingService();
