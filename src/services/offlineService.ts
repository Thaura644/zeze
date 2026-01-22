import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '@/types/music';

/**
 * Offline Service
 * Handles offline data storage, synchronization, and queue management
 */

const STORAGE_KEYS = {
  SONGS: '@zeze_offline_songs',
  PRACTICE_SESSIONS: '@zeze_offline_practice_sessions',
  SYNC_QUEUE: '@zeze_sync_queue',
  USER_PROFILE: '@zeze_user_profile',
  CACHED_TECHNIQUES: '@zeze_cached_techniques',
  CACHED_EXERCISES: '@zeze_cached_exercises',
  LAST_SYNC: '@zeze_last_sync',
};

interface OfflinePracticeSession {
  id: string;
  song_id: number;
  started_at: string;
  ended_at?: string;
  duration: number;
  accuracy: number;
  chords_played: any[];
  synced: boolean;
}

interface SyncQueueItem {
  id: string;
  type: 'practice_session' | 'song_save' | 'progress_update';
  data: any;
  timestamp: string;
  retryCount: number;
}

class OfflineService {
  private syncInProgress = false;

  /**
   * Save a song for offline access
   */
  async saveSongOffline(song: Song): Promise<void> {
    try {
      const offlineSongs = await this.getOfflineSongs();

      // Check if song already exists
      const existingIndex = offlineSongs.findIndex(s => s.id === song.id);

      if (existingIndex >= 0) {
        offlineSongs[existingIndex] = {
          ...song,
          offline_downloaded_at: new Date().toISOString(),
        };
      } else {
        offlineSongs.push({
          ...song,
          offline_downloaded_at: new Date().toISOString(),
        });
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.SONGS,
        JSON.stringify(offlineSongs)
      );

      console.log('Song saved for offline access:', song.title);
    } catch (error) {
      console.error('Failed to save song offline:', error);
      throw error;
    }
  }

  /**
   * Get all offline songs
   */
  async getOfflineSongs(): Promise<Song[]> {
    try {
      const songsJson = await AsyncStorage.getItem(STORAGE_KEYS.SONGS);

      if (!songsJson) {
        return [];
      }

      return JSON.parse(songsJson);
    } catch (error) {
      console.error('Failed to get offline songs:', error);
      return [];
    }
  }

  /**
   * Remove a song from offline storage
   */
  async removeSongOffline(songId: number): Promise<void> {
    try {
      const offlineSongs = await this.getOfflineSongs();
      const filteredSongs = offlineSongs.filter(s => s.id !== songId);

      await AsyncStorage.setItem(
        STORAGE_KEYS.SONGS,
        JSON.stringify(filteredSongs)
      );

      console.log('Song removed from offline storage:', songId);
    } catch (error) {
      console.error('Failed to remove song offline:', error);
      throw error;
    }
  }

  /**
   * Check if a song is available offline
   */
  async isSongAvailableOffline(songId: number): Promise<boolean> {
    try {
      const offlineSongs = await this.getOfflineSongs();
      return offlineSongs.some(s => s.id === songId);
    } catch (error) {
      console.error('Failed to check song offline status:', error);
      return false;
    }
  }

  /**
   * Save practice session offline (to be synced later)
   */
  async savePracticeSessionOffline(session: OfflinePracticeSession): Promise<void> {
    try {
      const sessions = await this.getOfflinePracticeSessions();
      sessions.push({ ...session, synced: false });

      await AsyncStorage.setItem(
        STORAGE_KEYS.PRACTICE_SESSIONS,
        JSON.stringify(sessions)
      );

      // Add to sync queue
      await this.addToSyncQueue({
        type: 'practice_session',
        data: session,
      });

      console.log('Practice session saved offline');
    } catch (error) {
      console.error('Failed to save practice session offline:', error);
      throw error;
    }
  }

  /**
   * Get all offline practice sessions
   */
  async getOfflinePracticeSessions(): Promise<OfflinePracticeSession[]> {
    try {
      const sessionsJson = await AsyncStorage.getItem(STORAGE_KEYS.PRACTICE_SESSIONS);

      if (!sessionsJson) {
        return [];
      }

      return JSON.parse(sessionsJson);
    } catch (error) {
      console.error('Failed to get offline practice sessions:', error);
      return [];
    }
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getSyncQueue();

      const queueItem: SyncQueueItem = {
        ...item,
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      queue.push(queueItem);

      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_QUEUE,
        JSON.stringify(queue)
      );

      console.log('Item added to sync queue:', item.type);
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
      throw error;
    }
  }

  /**
   * Get sync queue
   */
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const queueJson = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);

      if (!queueJson) {
        return [];
      }

      return JSON.parse(queueJson);
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Sync offline data with server
   */
  async syncWithServer(apiClient: any): Promise<{ success: boolean; synced: number; failed: number }> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return { success: false, synced: 0, failed: 0 };
    }

    this.syncInProgress = true;

    try {
      const queue = await this.getSyncQueue();

      if (queue.length === 0) {
        console.log('No items to sync');
        this.syncInProgress = false;
        return { success: true, synced: 0, failed: 0 };
      }

      console.log(`Syncing ${queue.length} items...`);

      let syncedCount = 0;
      let failedCount = 0;
      const remainingQueue: SyncQueueItem[] = [];

      for (const item of queue) {
        try {
          await this.syncQueueItem(item, apiClient);
          syncedCount++;
        } catch (error) {
          console.error('Failed to sync item:', item.type, error);

          // Retry logic
          if (item.retryCount < 3) {
            remainingQueue.push({
              ...item,
              retryCount: item.retryCount + 1,
            });
          } else {
            failedCount++;
          }
        }
      }

      // Update sync queue
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_QUEUE,
        JSON.stringify(remainingQueue)
      );

      // Update last sync timestamp
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );

      console.log(`Sync complete: ${syncedCount} synced, ${failedCount} failed, ${remainingQueue.length} queued for retry`);

      this.syncInProgress = false;

      return {
        success: true,
        synced: syncedCount,
        failed: failedCount,
      };
    } catch (error) {
      console.error('Sync failed:', error);
      this.syncInProgress = false;
      return { success: false, synced: 0, failed: 0 };
    }
  }

  /**
   * Sync individual queue item
   */
  private async syncQueueItem(item: SyncQueueItem, apiClient: any): Promise<void> {
    switch (item.type) {
      case 'practice_session':
        await apiClient.post('/practice/sessions', item.data);
        break;

      case 'song_save':
        await apiClient.post(`/songs/${item.data.song_id}/save`, item.data);
        break;

      case 'progress_update':
        await apiClient.put('/users/progress', item.data);
        break;

      default:
        console.warn('Unknown sync item type:', item.type);
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  }

  /**
   * Cache user profile
   */
  async cacheUserProfile(profile: any): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(profile)
      );
      console.log('User profile cached');
    } catch (error) {
      console.error('Failed to cache user profile:', error);
    }
  }

  /**
   * Get cached user profile
   */
  async getCachedUserProfile(): Promise<any | null> {
    try {
      const profileJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);

      if (!profileJson) {
        return null;
      }

      return JSON.parse(profileJson);
    } catch (error) {
      console.error('Failed to get cached user profile:', error);
      return null;
    }
  }

  /**
   * Cache techniques
   */
  async cacheTechniques(techniques: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_TECHNIQUES,
        JSON.stringify(techniques)
      );
      console.log(`${techniques.length} techniques cached`);
    } catch (error) {
      console.error('Failed to cache techniques:', error);
    }
  }

  /**
   * Get cached techniques
   */
  async getCachedTechniques(): Promise<any[]> {
    try {
      const techniquesJson = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_TECHNIQUES);

      if (!techniquesJson) {
        return [];
      }

      return JSON.parse(techniquesJson);
    } catch (error) {
      console.error('Failed to get cached techniques:', error);
      return [];
    }
  }

  /**
   * Cache exercises
   */
  async cacheExercises(exercises: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_EXERCISES,
        JSON.stringify(exercises)
      );
      console.log(`${exercises.length} exercises cached`);
    } catch (error) {
      console.error('Failed to cache exercises:', error);
    }
  }

  /**
   * Get cached exercises
   */
  async getCachedExercises(): Promise<any[]> {
    try {
      const exercisesJson = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_EXERCISES);

      if (!exercisesJson) {
        return [];
      }

      return JSON.parse(exercisesJson);
    } catch (error) {
      console.error('Failed to get cached exercises:', error);
      return [];
    }
  }

  /**
   * Clear all offline data
   */
  async clearAllOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SONGS,
        STORAGE_KEYS.PRACTICE_SESSIONS,
        STORAGE_KEYS.SYNC_QUEUE,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.CACHED_TECHNIQUES,
        STORAGE_KEYS.CACHED_EXERCISES,
        STORAGE_KEYS.LAST_SYNC,
      ]);

      console.log('All offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }

  /**
   * Get offline storage statistics
   */
  async getStorageStats(): Promise<{
    songs: number;
    practiceSessions: number;
    syncQueueItems: number;
    lastSync: string | null;
  }> {
    try {
      const [songs, sessions, queue, lastSync] = await Promise.all([
        this.getOfflineSongs(),
        this.getOfflinePracticeSessions(),
        this.getSyncQueue(),
        this.getLastSyncTime(),
      ]);

      return {
        songs: songs.length,
        practiceSessions: sessions.filter(s => !s.synced).length,
        syncQueueItems: queue.length,
        lastSync,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        songs: 0,
        practiceSessions: 0,
        syncQueueItems: 0,
        lastSync: null,
      };
    }
  }
}

export default new OfflineService();
