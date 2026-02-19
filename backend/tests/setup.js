// Jest test setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'zeze_guitar_test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    email: 'test@example.com',
    username: 'testuser',
    password: 'password123',
    display_name: 'Test User',
    skill_level: 3,
    ...overrides
  }),

  // Generate test song data
  generateTestSong: (overrides = {}) => ({
    title: 'Test Song',
    artist: 'Test Artist',
    duration_seconds: 180,
    original_key: 'C',
    tempo_bpm: 120,
    overall_difficulty: 3.0,
    processing_status: 'completed',
    ...overrides
  }),

  // Generate test practice session data
  generateTestSession: (overrides = {}) => ({
    session_type: 'song_practice',
    focus_techniques: ['basic-strumming'],
    tempo_percentage: 100,
    ...overrides
  }),

  // Wait for async operations
  wait: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate UUID
  generateUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  })
};

// Mock external services
jest.mock('@distube/ytdl-core', () => ({
  getInfo: jest.fn(() => Promise.resolve({
    videoDetails: {
      title: 'Test Video',
      author: { name: 'Test Artist' },
      lengthSeconds: 180,
      thumbnails: [{ url: 'http://example.com/thumb.jpg' }],
      uploadDate: '2023-01-01'
    }
  })),
  download: jest.fn(() => require('stream').Readable())
}));

jest.mock('fluent-ffmpeg', () => {
  return jest.fn(() => ({
    toFormat: jest.fn().mockReturnThis(),
    audioCodec: jest.fn().mockReturnThis(),
    audioFrequency: jest.fn().mockReturnThis(),
    audioChannels: jest.fn().mockReturnThis(),
    seekInput: jest.fn().mockReturnThis(),
    duration: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    save: jest.fn().mockReturnThis()
  }));
});

// Setup and teardown hooks
beforeAll(async () => {
  // Any global setup needed for tests
});

afterAll(async () => {
  // Any global cleanup needed after tests
  const { pool } = require('../config/database');
  await pool.end();
});

beforeEach(async () => {
  // Clean up database before each test
  const { query } = require('../config/database');
  const tables = [
    'practice_analysis',
    'practice_sessions',
    'user_songs',
    'song_techniques',
    'techniques',
    'chords',
    'songs',
    'users',
    'migrations'
  ];

  for (const table of tables) {
    try {
      await query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    } catch (error) {
      // Table might not exist, that's okay for some tests
    }
  }
});

// Mock any file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdir: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('mock file content')),
  rm: jest.fn(() => Promise.resolve())
}));