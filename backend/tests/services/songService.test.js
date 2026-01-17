const songService = require('../services/songService');

describe('SongService', () => {
  describe('createSong', () => {
    it('should create a new song with valid data', async () => {
      const songData = {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration_seconds: 180,
        original_key: 'C',
        tempo_bpm: 120.0,
        overall_difficulty: 3.5,
        chord_difficulty: 3.0,
        processing_status: 'completed',
        chord_progression: [
          { chord: 'C', start_time: 0.0, duration: 4.0, confidence: 0.95 },
          { chord: 'G', start_time: 4.0, duration: 4.0, confidence: 0.92 }
        ]
      };

      const song = await songService.createSong(songData);

      expect(song).toHaveProperty('song_id');
      expect(song.title).toBe(songData.title);
      expect(song.artist).toBe(songData.artist);
      expect(song.album).toBe(songData.album);
      expect(song.duration_seconds).toBe(songData.duration_seconds);
      expect(song.original_key).toBe(songData.original_key);
      expect(song.tempo_bpm).toBe(songData.tempo_bpm);
      expect(song.overall_difficulty).toBe(songData.overall_difficulty);
      expect(song.processing_status).toBe('completed');
      expect(song.created_at).toBeDefined();
    });

    it('should throw error for duplicate YouTube ID', async () => {
      const songData = {
        youtube_id: 'test123',
        title: 'Test Song 1',
        artist: 'Test Artist',
        duration_seconds: 180,
        processing_status: 'completed'
      };

      await songService.createSong(songData);

      const duplicateSongData = {
        youtube_id: 'test123',
        title: 'Test Song 2',
        artist: 'Test Artist',
        duration_seconds: 200,
        processing_status: 'completed'
      };

      await expect(songService.createSong(duplicateSongData))
        .rejects.toThrow('Song with this YouTube ID already exists');
    });
  });

  describe('getSongById', () => {
    it('should return song when found', async () => {
      const songData = {
        title: 'Test Song',
        artist: 'Test Artist',
        duration_seconds: 180,
        processing_status: 'completed'
      };

      const createdSong = await songService.createSong(songData);
      const foundSong = await songService.getSongById(createdSong.song_id);

      expect(foundSong.song_id).toBe(createdSong.song_id);
      expect(foundSong.title).toBe(songData.title);
      expect(foundSong.artist).toBe(songData.artist);
    });

    it('should return null when song not found', async () => {
      const fakeSongId = '00000000-0000-0000-0000-000000000000';
      const song = await songService.getSongById(fakeSongId);

      expect(song).toBeNull();
    });
  });

  describe('getSongByYouTubeId', () => {
    it('should return song when found', async () => {
      const songData = {
        youtube_id: 'test123',
        title: 'Test Song',
        artist: 'Test Artist',
        duration_seconds: 180,
        processing_status: 'completed'
      };

      await songService.createSong(songData);
      const foundSong = await songService.getSongByYouTubeId('test123');

      expect(foundSong.youtube_id).toBe('test123');
      expect(foundSong.title).toBe(songData.title);
    });

    it('should return null when song not found', async () => {
      const song = await songService.getSongByYouTubeId('nonexistent');
      expect(song).toBeNull();
    });
  });

  describe('searchSongs', () => {
    beforeEach(async () => {
      // Create test songs for search
      const songs = [
        { title: 'Wonderwall', artist: 'Oasis', overall_difficulty: 3.0, processing_status: 'completed' },
        { title: 'Let It Be', artist: 'The Beatles', overall_difficulty: 2.0, processing_status: 'completed' },
        { title: 'Stairway to Heaven', artist: 'Led Zeppelin', overall_difficulty: 5.0, processing_status: 'completed' },
        { title: 'Sweet Child O Mine', artist: 'Guns N Roses', overall_difficulty: 4.0, processing_status: 'completed' }
      ];

      for (const songData of songs) {
        await songService.createSong(songData);
      }
    });

    it('should search songs by title', async () => {
      const results = await songService.searchSongs({
        query: 'Wonderwall',
        limit: 10,
        offset: 0
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Wonderwall');
      expect(results[0].artist).toBe('Oasis');
    });

    it('should search songs by artist', async () => {
      const results = await songService.searchSongs({
        artist: 'Beatles',
        limit: 10,
        offset: 0
      });

      expect(results).toHaveLength(1);
      expect(results[0].artist).toBe('The Beatles');
      expect(results[0].title).toBe('Let It Be');
    });

    it('should filter by difficulty range', async () => {
      const results = await songService.searchSongs({
        difficulty_min: 3.0,
        difficulty_max: 4.0,
        limit: 10,
        offset: 0
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(song => {
        expect(song.overall_difficulty).toBeGreaterThanOrEqual(3.0);
        expect(song.overall_difficulty).toBeLessThanOrEqual(4.0);
      });
    });

    it('should respect limit and offset', async () => {
      const results1 = await songService.searchSongs({
        limit: 2,
        offset: 0
      });

      const results2 = await songService.searchSongs({
        limit: 2,
        offset: 2
      });

      expect(results1).toHaveLength(2);
      expect(results2).toHaveLength(2);
      expect(results1[0].song_id).not.toBe(results2[0].song_id);
    });
  });

  describe('saveSongToLibrary', () => {
    it('should save song to user library', async () => {
      // Create test user and song
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        hashed_password: '$2b$12$LQv3c1yqBwQJJib2fCz9u.tJtqJKhdQmm5dQf5Q5YIqQhX9f.su2'
      };

      const songData = {
        title: 'Test Song',
        artist: 'Test Artist',
        duration_seconds: 180,
        processing_status: 'completed'
      };

      const userService = require('../services/userService');
      const user = await userService.createUser(userData);
      const song = await songService.createSong(songData);

      const savedSong = await songService.saveSongToLibrary(user.user_id, song.song_id);

      expect(savedSong).toHaveProperty('user_song_id');
      expect(savedSong.user_id).toBe(user.user_id);
      expect(savedSong.song_id).toBe(song.song_id);
      expect(savedSong.saved_at).toBeDefined();
    });

    it('should return null for duplicate save', async () => {
      const userData = {
        email: 'test2@example.com',
        username: 'testuser2',
        hashed_password: '$2b$12$LQv3c1yqBwQJJib2fCz9u.tJtqJKhdQmm5dQf5Q5YIqQhX9f.su2'
      };

      const songData = {
        title: 'Test Song 2',
        artist: 'Test Artist 2',
        duration_seconds: 180,
        processing_status: 'completed'
      };

      const userService = require('../services/userService');
      const user = await userService.createUser(userData);
      const song = await songService.createSong(songData);

      // First save should succeed
      await songService.saveSongToLibrary(user.user_id, song.song_id);

      // Second save should return null
      const duplicateSave = await songService.saveSongToLibrary(user.user_id, song.song_id);
      expect(duplicateSave).toBeNull();
    });
  });

  describe('transposeSong', () => {
    it('should transpose song to different key', async () => {
      const songData = {
        title: 'Test Song',
        artist: 'Test Artist',
        duration_seconds: 180,
        original_key: 'G',
        processing_status: 'completed',
        chord_progression: [
          { chord: 'G', start_time: 0.0, duration: 4.0, confidence: 0.95 },
          { chord: 'D', start_time: 4.0, duration: 4.0, confidence: 0.92 }
        ]
      };

      const song = await songService.createSong(songData);
      const transposition = await songService.transposeSong(song.song_id, 'C');

      expect(transposition).toHaveProperty('original_key', 'G');
      expect(transposition).toHaveProperty('target_key', 'C');
      expect(transposition).toHaveProperty('capo_position');
      expect(transposition).toHaveProperty('chord_progression');
      expect(transposition).toHaveProperty('tablature');
    });
  });

  describe('updatePopularityScore', () => {
    it('should update song popularity score', async () => {
      const songData = {
        title: 'Test Song',
        artist: 'Test Artist',
        duration_seconds: 180,
        processing_status: 'completed',
        popularity_score: 5.0
      };

      const song = await songService.createSong(songData);
      const updatedSong = await songService.updatePopularityScore(song.song_id);

      expect(updatedSong).toHaveProperty('popularity_score');
      expect(typeof updatedSong.popularity_score).toBe('number');
    });
  });
});