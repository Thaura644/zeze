const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { cache } = require('../config/redis');

class AudioProcessingService {
  constructor() {
    this.supportedFormats = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
    this.maxFileSize = (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024; // Convert to bytes
  }

  // Extract YouTube video ID from URL
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Get YouTube video metadata
  async getYouTubeMetadata(videoId) {
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
    } catch (error) {
      logger.error('Failed to get YouTube metadata', { videoId, error: error.message });
      throw new Error('Failed to retrieve video metadata');
    }
  }

  // Download audio from YouTube
  async downloadYouTubeAudio(videoId, outputPath) {
    return new Promise((resolve, reject) => {
      const stream = ytdl(videoId, {
        quality: 'highestaudio',
        filter: 'audioonly'
      });

      const writeStream = require('fs').createWriteStream(outputPath);

      stream.on('error', reject);
      writeStream.on('error', reject);
      
      stream.pipe(writeStream);

      stream.on('end', () => {
        logger.info(`YouTube audio downloaded: ${videoId}`);
        resolve(outputPath);
      });
    });
  }

  // Convert audio to WAV format for processing
  async convertToWav(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(1) // Convert to mono for better analysis
        .on('end', () => {
          logger.info(`Audio converted to WAV: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          logger.error('Audio conversion failed', { inputPath, error: error.message });
          reject(error);
        })
        .save(outputPath);
    });
  }

  // Extract 30-second sample from audio
  async extractAudioSample(inputPath, outputPath, startTime = 30) {
    return new Promise((resolve, reject) => {
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
    });
  }

  // Process YouTube URL completely
  async processYouTubeUrl(youtubeUrl, userPreferences = {}) {
    const jobId = uuidv4();
    const processingSteps = [
      'download',
      'metadata_extraction',
      'audio_conversion',
      'sample_extraction',
      'audio_analysis',
      'chord_detection',
      'tempo_detection',
      'key_detection',
      'tab_generation',
      'completion'
    ];

    try {
      // Update job status in cache
      await this.updateJobProgress(jobId, 'download', 0);

      // Extract video ID
      const videoId = this.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL format');
      }

      await this.updateJobProgress(jobId, 'metadata_extraction', 10);

      // Get video metadata
      const metadata = await this.getYouTubeMetadata(videoId);

      await this.updateJobProgress(jobId, 'download', 20);

      // Create temp directory
      const tempDir = path.join(process.cwd(), 'temp', jobId);
      await fs.mkdir(tempDir, { recursive: true });

      // Download full audio
      const rawAudioPath = path.join(tempDir, 'raw.webm');
      await this.downloadYouTubeAudio(videoId, rawAudioPath);

      await this.updateJobProgress(jobId, 'audio_conversion', 40);

      // Convert to WAV
      const wavPath = path.join(tempDir, 'audio.wav');
      await this.convertToWav(rawAudioPath, wavPath);

      await this.updateJobProgress(jobId, 'sample_extraction', 50);

      // Extract 30-second sample
      const samplePath = path.join(tempDir, 'sample.wav');
      const sampleStartTime = Math.min(30, Math.floor(metadata.duration / 2)); // Start at 30s or middle of song
      await this.extractAudioSample(wavPath, samplePath, sampleStartTime);

      await this.updateJobProgress(jobId, 'audio_analysis', 60);

      // Analyze audio (placeholder for actual ML processing)
      const analysis = await this.analyzeAudio(samplePath, metadata);

      await this.updateJobProgress(jobId, 'chord_detection', 75);

      // Detect chords (placeholder)
      const chords = await this.detectChords(samplePath, analysis);

      await this.updateJobProgress(jobId, 'tempo_detection', 85);

      // Detect tempo (placeholder)
      const tempo = await this.detectTempo(samplePath);

      await this.updateJobProgress(jobId, 'key_detection', 90);

      // Detect key (placeholder)
      const key = await this.detectKey(samplePath);

      await this.updateJobProgress(jobId, 'tab_generation', 95);

      // Generate tablature (placeholder)
      const tablature = await this.generateTablature(chords, analysis);

      await this.updateJobProgress(jobId, 'completion', 100);

      // Clean up temp files
      await this.cleanup(tempDir);

      // Return results
      const results = {
        jobId,
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

      // Cache results
      await cache.set(`job_${jobId}`, results, 3600); // Cache for 1 hour

      return results;

    } catch (error) {
      logger.error('YouTube processing failed', { jobId, error: error.message });
      
      // Update job status with error
      await this.updateJobProgress(jobId, 'error', null, error.message);
      
      throw error;
    }
  }

  // Update job progress in cache
  async updateJobProgress(jobId, currentStep, progressPercentage, error = null) {
    const jobStatus = {
      job_id: jobId,
      status: error ? 'failed' : (progressPercentage === 100 ? 'completed' : 'processing'),
      current_step: currentStep,
      progress_percentage: progressPercentage,
      error: error,
      updated_at: new Date().toISOString()
    };

    await cache.set(`job_status_${jobId}`, jobStatus, 3600);
  }

  // Get job status
  async getJobStatus(jobId) {
    return await cache.get(`job_status_${jobId}`);
  }

  // Get job results
  async getJobResults(jobId) {
    return await cache.get(`job_${jobId}`);
  }

  // Placeholder audio analysis (would integrate with actual ML models)
  async analyzeAudio(audioPath, metadata) {
    // This would integrate with Spotify Basic Pitch, Google's Onsets & Frames, etc.
    logger.info(`Analyzing audio: ${audioPath}`);
    
    // Mock analysis results
    return {
      duration: metadata.duration,
      sample_rate: 44100,
      bit_depth: 16,
      channels: 1,
      rms_level: 0.75,
      zero_crossing_rate: 0.05,
      spectral_centroid: 2000,
      spectral_rolloff: 4000,
      mfcc: Array(13).fill(0).map(() => Math.random()),
      onset_times: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
      beat_times: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
      sections: [
        { start: 0, end: 8, type: 'intro' },
        { start: 8, end: 24, type: 'verse' },
        { start: 24, end: 40, type: 'chorus' }
      ]
    };
  }

  // Placeholder chord detection
  async detectChords(audioPath, analysis) {
    // This would integrate with Spotify Basic Pitch or similar
    logger.info(`Detecting chords in: ${audioPath}`);
    
    // Mock chord progression
    return [
      { chord: 'Em', startTime: 0.0, duration: 2.0, confidence: 0.95 },
      { chord: 'C', startTime: 2.0, duration: 2.0, confidence: 0.92 },
      { chord: 'G', startTime: 4.0, duration: 2.0, confidence: 0.88 },
      { chord: 'D', startTime: 6.0, duration: 2.0, confidence: 0.90 },
      { chord: 'Em', startTime: 8.0, duration: 2.0, confidence: 0.94 },
      { chord: 'C', startTime: 10.0, duration: 2.0, confidence: 0.91 },
      { chord: 'G', startTime: 12.0, duration: 2.0, confidence: 0.89 },
      { chord: 'D', startTime: 14.0, duration: 2.0, confidence: 0.87 }
    ];
  }

  // Placeholder tempo detection
  async detectTempo(audioPath) {
    // This would integrate with Librosa or similar
    logger.info(`Detecting tempo in: ${audioPath}`);
    
    // Mock tempo
    return {
      bpm: 120,
      confidence: 0.85,
      time_signature: '4/4'
    };
  }

  // Placeholder key detection
  async detectKey(audioPath) {
    // This would integrate with Krumhansl-Schmuckler algorithm or similar
    logger.info(`Detecting key in: ${audioPath}`);
    
    // Mock key detection
    return {
      key: 'G',
      scale: 'major',
      confidence: 0.82,
      related_keys: ['C', 'D', 'Em', 'Am']
    };
  }

  // Placeholder tablature generation
  async generateTablature(chords, analysis) {
    // This would integrate with GPT-4 and custom rules engine
    logger.info('Generating tablature');
    
    // Mock tablature
    return {
      tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
      capo: 0,
      notes: chords.map((chord, index) => ({
        string: Math.floor(Math.random() * 6),
        fret: Math.floor(Math.random() * 12),
        time: chord.startTime,
        duration: chord.duration,
        chord: chord.chord
      }))
    };
  }

  // Clean up temporary files
  async cleanup(tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      logger.info(`Cleaned up temp directory: ${tempDir}`);
    } catch (error) {
      logger.error('Failed to cleanup temp directory', { tempDir, error: error.message });
    }
  }
}

module.exports = new AudioProcessingService();