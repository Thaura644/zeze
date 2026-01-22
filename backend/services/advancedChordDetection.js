const fs = require('fs').promises;
const logger = require('../config/logger');

/**
 * Advanced Chord Detection Service
 * Implements chromagram-based chord recognition algorithm
 */
class AdvancedChordDetectionService {
  constructor() {
    // Chord templates based on chromagrams
    this.chordTemplates = this.initializeChordTemplates();
    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  /**
   * Initialize chord templates
   * Each template is a 12-element array representing the chromatic scale
   */
  initializeChordTemplates() {
    const templates = {};

    // Major chords (Root, Major 3rd, Perfect 5th)
    const majorPattern = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0];

    // Minor chords (Root, Minor 3rd, Perfect 5th)
    const minorPattern = [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0];

    // Dominant 7th chords (Root, Major 3rd, Perfect 5th, Minor 7th)
    const dom7Pattern = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];

    // Major 7th chords (Root, Major 3rd, Perfect 5th, Major 7th)
    const maj7Pattern = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1];

    // Minor 7th chords (Root, Minor 3rd, Perfect 5th, Minor 7th)
    const min7Pattern = [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0];

    // Diminished chords (Root, Minor 3rd, Diminished 5th)
    const dimPattern = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];

    // Augmented chords (Root, Major 3rd, Augmented 5th)
    const augPattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

    // Sus4 chords (Root, Perfect 4th, Perfect 5th)
    const sus4Pattern = [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0];

    // Sus2 chords (Root, Major 2nd, Perfect 5th)
    const sus2Pattern = [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0];

    // Generate all transpositions
    this.noteNames.forEach((note, rootIndex) => {
      templates[note] = this.rotatePattern(majorPattern, rootIndex);
      templates[note + 'm'] = this.rotatePattern(minorPattern, rootIndex);
      templates[note + '7'] = this.rotatePattern(dom7Pattern, rootIndex);
      templates[note + 'maj7'] = this.rotatePattern(maj7Pattern, rootIndex);
      templates[note + 'm7'] = this.rotatePattern(min7Pattern, rootIndex);
      templates[note + 'dim'] = this.rotatePattern(dimPattern, rootIndex);
      templates[note + 'aug'] = this.rotatePattern(augPattern, rootIndex);
      templates[note + 'sus4'] = this.rotatePattern(sus4Pattern, rootIndex);
      templates[note + 'sus2'] = this.rotatePattern(sus2Pattern, rootIndex);
    });

    return templates;
  }

  /**
   * Rotate pattern to different root notes
   */
  rotatePattern(pattern, steps) {
    const result = [];
    for (let i = 0; i < 12; i++) {
      result[i] = pattern[(i - steps + 12) % 12];
    }
    return result;
  }

  /**
   * Detect chords from audio data using chromagram analysis
   * @param {Float32Array} audioData - Normalized audio samples
   * @param {number} sampleRate - Audio sample rate
   * @param {number} hopLength - Number of samples between frames
   * @returns {Array} Detected chords with timestamps
   */
  async detectChords(audioData, sampleRate = 44100, hopLength = 2048) {
    try {
      logger.info('Starting advanced chord detection');

      // Calculate chromagram
      const chromagram = this.calculateChromagram(audioData, sampleRate, hopLength);

      // Segment chromagram into chord regions
      const segments = this.segmentChromagram(chromagram, hopLength, sampleRate);

      // Identify chords for each segment
      const chords = segments.map(segment => {
        const chord = this.identifyChord(segment.chromaVector);
        return {
          chord: chord.name,
          start_time: segment.startTime,
          end_time: segment.endTime,
          duration: segment.endTime - segment.startTime,
          confidence: chord.confidence
        };
      });

      // Filter out low-confidence detections
      const filteredChords = chords.filter(c => c.confidence > 0.4);

      // Merge consecutive identical chords
      const mergedChords = this.mergeConsecutiveChords(filteredChords);

      logger.info(`Detected ${mergedChords.length} chords`);
      return mergedChords;
    } catch (error) {
      logger.error('Advanced chord detection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate chromagram (pitch class distribution over time)
   */
  calculateChromagram(audioData, sampleRate, hopLength) {
    const chromagram = [];
    const frameSize = 4096;
    const numFrames = Math.floor((audioData.length - frameSize) / hopLength);

    for (let i = 0; i < numFrames; i++) {
      const frameStart = i * hopLength;
      const frame = audioData.slice(frameStart, frameStart + frameSize);

      // Apply Hamming window
      const windowedFrame = this.applyHammingWindow(frame);

      // Compute FFT
      const spectrum = this.computeFFT(windowedFrame);

      // Map frequencies to pitch classes (C, C#, D, ..., B)
      const chromaVector = this.mapToChroma(spectrum, sampleRate, frameSize);

      chromagram.push(chromaVector);
    }

    return chromagram;
  }

  /**
   * Apply Hamming window to reduce spectral leakage
   */
  applyHammingWindow(frame) {
    const windowed = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (frame.length - 1));
      windowed[i] = frame[i] * window;
    }
    return windowed;
  }

  /**
   * Compute Fast Fourier Transform (simplified implementation)
   * For production, use a library like fft.js or kiss-fft
   */
  computeFFT(frame) {
    // Simplified DFT for demonstration
    // In production, use an optimized FFT library
    const N = frame.length;
    const spectrum = [];

    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += frame[n] * Math.cos(angle);
        imag += frame[n] * Math.sin(angle);
      }

      const magnitude = Math.sqrt(real * real + imag * imag);
      spectrum.push(magnitude);
    }

    return spectrum;
  }

  /**
   * Map frequency spectrum to 12 pitch classes
   */
  mapToChroma(spectrum, sampleRate, frameSize) {
    const chromaVector = new Array(12).fill(0);
    const freqPerBin = sampleRate / frameSize;

    for (let bin = 1; bin < spectrum.length; bin++) {
      const freq = bin * freqPerBin;

      // Skip very low and very high frequencies
      if (freq < 80 || freq > 1000) continue;

      // Convert frequency to MIDI note
      const midiNote = 12 * Math.log2(freq / 440) + 69;

      // Map to pitch class (0-11)
      const pitchClass = Math.round(midiNote) % 12;

      if (pitchClass >= 0 && pitchClass < 12) {
        chromaVector[pitchClass] += spectrum[bin];
      }
    }

    // Normalize
    const sum = chromaVector.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < 12; i++) {
        chromaVector[i] /= sum;
      }
    }

    return chromaVector;
  }

  /**
   * Segment chromagram into regions of similar harmonic content
   */
  segmentChromagram(chromagram, hopLength, sampleRate) {
    const segments = [];
    const minSegmentLength = 4; // Minimum 4 frames per segment

    let currentSegment = {
      chromaVector: new Array(12).fill(0),
      startFrame: 0,
      frameCount: 0
    };

    for (let i = 0; i < chromagram.length; i++) {
      const chroma = chromagram[i];

      // Check if chroma is significantly different from current segment
      if (currentSegment.frameCount > 0) {
        const avgChroma = currentSegment.chromaVector.map(v => v / currentSegment.frameCount);
        const similarity = this.cosineSimilarity(avgChroma, chroma);

        // If similarity is low and we have enough frames, start a new segment
        if (similarity < 0.7 && currentSegment.frameCount >= minSegmentLength) {
          // Save current segment
          const avgChroma = currentSegment.chromaVector.map(v => v / currentSegment.frameCount);
          segments.push({
            chromaVector: avgChroma,
            startTime: currentSegment.startFrame * hopLength / sampleRate,
            endTime: i * hopLength / sampleRate
          });

          // Start new segment
          currentSegment = {
            chromaVector: new Array(12).fill(0),
            startFrame: i,
            frameCount: 0
          };
        }
      }

      // Add current frame to segment
      for (let j = 0; j < 12; j++) {
        currentSegment.chromaVector[j] += chroma[j];
      }
      currentSegment.frameCount++;
    }

    // Add final segment
    if (currentSegment.frameCount > 0) {
      const avgChroma = currentSegment.chromaVector.map(v => v / currentSegment.frameCount);
      segments.push({
        chromaVector: avgChroma,
        startTime: currentSegment.startFrame * hopLength / sampleRate,
        endTime: chromagram.length * hopLength / sampleRate
      });
    }

    return segments;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Identify chord from chroma vector
   */
  identifyChord(chromaVector) {
    let bestMatch = { name: 'N', confidence: 0 };

    // Compare with all chord templates
    for (const [chordName, template] of Object.entries(this.chordTemplates)) {
      const similarity = this.cosineSimilarity(chromaVector, template);

      if (similarity > bestMatch.confidence) {
        bestMatch = {
          name: chordName,
          confidence: similarity
        };
      }
    }

    return bestMatch;
  }

  /**
   * Merge consecutive identical chords
   */
  mergeConsecutiveChords(chords) {
    if (chords.length === 0) return [];

    const merged = [];
    let current = { ...chords[0] };

    for (let i = 1; i < chords.length; i++) {
      if (chords[i].chord === current.chord) {
        // Extend current chord
        current.end_time = chords[i].end_time;
        current.duration = current.end_time - current.start_time;
        // Update confidence to average
        current.confidence = (current.confidence + chords[i].confidence) / 2;
      } else {
        // Save current chord and start a new one
        merged.push(current);
        current = { ...chords[i] };
      }
    }

    // Add final chord
    merged.push(current);

    return merged;
  }

  /**
   * Get chord fingering positions for guitar
   */
  getChordFingering(chordName) {
    const fingerings = {
      'C': { frets: [null, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], difficulty: 1 },
      'C#': { frets: [null, 4, 3, 1, 2, 1], fingers: [0, 4, 3, 1, 2, 1], difficulty: 3 },
      'D': { frets: [null, null, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], difficulty: 1 },
      'D#': { frets: [null, null, 1, 3, 4, 3], fingers: [0, 0, 1, 2, 4, 3], difficulty: 3 },
      'E': { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], difficulty: 1 },
      'F': { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], difficulty: 3 },
      'F#': { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], difficulty: 3 },
      'G': { frets: [3, 2, 0, 0, 0, 3], fingers: [3, 2, 0, 0, 0, 4], difficulty: 1 },
      'G#': { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], difficulty: 4 },
      'A': { frets: [null, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], difficulty: 1 },
      'A#': { frets: [null, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], difficulty: 3 },
      'B': { frets: [null, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], difficulty: 3 },

      'Cm': { frets: [null, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], difficulty: 3 },
      'Dm': { frets: [null, null, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], difficulty: 1 },
      'Em': { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 1, 2, 0, 0, 0], difficulty: 1 },
      'Fm': { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], difficulty: 4 },
      'Gm': { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], difficulty: 3 },
      'Am': { frets: [null, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], difficulty: 1 },
      'Bm': { frets: [null, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], difficulty: 3 },
    };

    return fingerings[chordName] || { frets: [], fingers: [], difficulty: 5 };
  }
}

module.exports = new AdvancedChordDetectionService();
