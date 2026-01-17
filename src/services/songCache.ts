import AsyncStorage from '@react-native-async-storage/async-storage';

export class SongCacheService {
  private static CACHE_PREFIX = 'song_cache_';
  private static CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  static async cacheSong(songId: string, songData: any): Promise<void> {
    try {
      const cacheData = {
        data: songData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${songId}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.warn('Failed to cache song data:', error);
    }
  }

  static async getCachedSong(songId: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${songId}`);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheData.timestamp > this.CACHE_EXPIRY) {
        await this.removeCachedSong(songId);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to get cached song:', error);
      return null;
    }
  }

  static async removeCachedSong(songId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${songId}`);
    } catch (error) {
      console.warn('Failed to remove cached song:', error);
    }
  }

  static async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}

export default SongCacheService;