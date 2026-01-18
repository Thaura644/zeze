import axios, { AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  skill_level: number;
  preferred_genres: string[];
  practice_goal?: string;
  created_at: string;
  last_login_at?: string;
}

export interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface JobStatus {
  job_id: string;
  status: string;
  progress_percentage: number;
  current_step: string;
  estimated_remaining_seconds?: number;
  partial_results?: any;
  error?: string;
}

export interface ProcessedResults {
  job_id: string;
  status: string;
  results: {
    song_id: string;
    metadata: {
      title: string;
      artist: string;
      duration: number;
      original_key: string;
      tempo_bpm: number;
      overall_difficulty: number;
      video_url?: string;
    };
    chords: Chord[];
    tablature: Tablature;
    techniques: Technique[];
    processed_at: string;
  };
}

export interface Chord {
  chord: string;
  start_time: number;
  duration: number;
  confidence?: number;
  fingerPositions?: FingerPosition[];
}

export interface FingerPosition {
  string: number;
  fret: number;
}

export interface Tablature {
  tuning: string[];
  notes: TabNote[];
}

export interface TabNote {
  string: number;
  fret: number;
  time: number;
  duration: number;
  chord?: string;
}

export interface Technique {
  technique: string;
  sections: string[];
}

export interface Song {
  song_id: string;
  title: string;
  artist: string;
  album?: string;
  duration_seconds: number;
  original_key: string;
  tempo_bpm: number;
  overall_difficulty: number;
  thumbnail_url?: string;
  popularity_score: number;
  chords?: Chord[];
  tablature?: Tablature;
  is_saved?: boolean;
}

export interface PracticeSession {
  session_id: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  session_type: string;
  overall_accuracy?: number;
  timing_accuracy?: number;
  pitch_accuracy?: number;
  rhythm_accuracy?: number;
  user_rating?: number;
  session_notes?: string;
}

export interface AnalysisResults {
  analysis_results: {
    overall_accuracy: number;
    timing_accuracy: number;
    pitch_accuracy: number;
    rhythm_accuracy: number;
    chord_accuracy: Record<string, any>;
    mistakes: any[];
    improvement_areas: string[];
    next_practice_suggestions: any;
  };
}

class ApiService {
  private api: any;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for adding auth token and version headers
    this.api.interceptors.request.use(
      async (config: any) => {
        const { accessToken } = await this.getStoredTokens();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        // Add version headers for backend checking
        config.headers['platform'] = this.getPlatform();
        config.headers['app_version'] = await this.getCurrentVersion();
        
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        await this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private async handleApiError(error: AxiosError): Promise<void> {
    if (error.response?.status === 401) {
      await this.clearStoredTokens();
      console.warn('Authentication error - tokens cleared');
    }
  }

  // Authentication endpoints
  async register(userData: {
    email: string;
    username: string;
    password: string;
    display_name?: string;
  }): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await this.api.post('/users/register', userData);

      if (response.data?.tokens) {
        await this.setStoredTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await this.api.post('/users/login', {
        email,
        password,
      });

      if (response.data?.tokens) {
        await this.setStoredTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async setStoredTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
  }

  async getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    return { accessToken, refreshToken };
  }

  async clearStoredTokens(): Promise<void> {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
  }

  async logout(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/users/logout', {});
      await this.clearStoredTokens();
      return response.data;
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async refreshToken(): Promise<ApiResponse<LoginResponse>> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.api.post('/users/refresh', {
        refreshToken,
      });

      if (response.data?.tokens) {
        this.setStoredTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response.data;
    } catch (error: any) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  async getUserProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.get('/users/profile');
      return response.data;
    } catch (error: any) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  async updateUserProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.put('/users/profile', userData);
      return response.data;
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Audio processing endpoints
  async uploadAudio(
    file: any,
    userPreferences?: any
  ): Promise<ApiResponse<{ job_id: string; status: string; results?: ProcessedResults['results'] }>> {
    try {
      const formData = new FormData();

      // In React Native, the file object should look like { uri, name, type }
      formData.append('audio_file', file);

      if (userPreferences) {
        formData.append('user_preferences', JSON.stringify(userPreferences));
      }

      const response = await this.api.post('/process-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Upload audio error:', error);
      throw error;
    }
  }

  async processYouTubeUrl(
    youtubeUrl: string,
    userPreferences?: any
  ): Promise<ApiResponse<{ job_id: string; status: string; results?: ProcessedResults['results'] }>> {
    try {
      const response = await this.api.post('/process-youtube', {
        youtube_url: youtubeUrl,
        user_preferences: userPreferences || {},
      });
      return response.data;
    } catch (error: any) {
      console.error('Process YouTube error:', error);
      throw error;
    }
  }

  async getProcessingStatus(jobId: string): Promise<ApiResponse<JobStatus>> {
    try {
      const response = await this.api.get(`/process-status/${jobId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get processing status error:', error);
      throw error;
    }
  }

  async getSongResults(jobId: string): Promise<ApiResponse<ProcessedResults>> {
    try {
      const response = await this.api.get(`/song-results/${jobId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get song results error:', error);
      throw error;
    }
  }

  async transposeSong(
    songId: string,
    targetKey: string,
    preserveFingering: boolean = true
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/transpose', {
        song_id: songId,
        target_key: targetKey,
        preserve_fingering: preserveFingering,
      });
      return response.data;
    } catch (error: any) {
      console.error('Transpose song error:', error);
      throw error;
    }
  }

  async getTechniqueGuidance(
    songId: string,
    timestamp: number
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(`/techniques/${songId}/${timestamp}`);
      return response.data;
    } catch (error: any) {
      console.error('Get technique guidance error:', error);
      throw error;
    }
  }

  // Songs endpoints
  async searchSongs(params: {
    query?: string;
    artist?: string;
    difficulty_min?: number;
    difficulty_max?: number;
    key_filter?: string;
    tempo_min?: number;
    tempo_max?: number;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ songs: Song[]; pagination: any }>> {
    try {
      const response = await this.api.get('/songs/search', { params });
      return response.data;
    } catch (error: any) {
      console.error('Search songs error:', error);
      throw error;
    }
  }

  async getSongById(songId: string): Promise<ApiResponse<Song>> {
    try {
      const response = await this.api.get(`/songs/${songId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get song error:', error);
      throw error;
    }
  }

  async getPopularSongs(limit?: number): Promise<ApiResponse<{ songs: Song[]; pagination: any }>> {
    try {
      const response = await this.api.get('/songs/popular/list', {
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      console.error('Get popular songs error:', error);
      throw error;
    }
  }

  async getRecommendedSongs(limit?: number): Promise<ApiResponse<{ songs: Song[]; pagination: any }>> {
    try {
      const response = await this.api.get('/songs/recommended/list', {
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      console.error('Get recommended songs error:', error);
      throw error;
    }
  }

  async saveSongToLibrary(songId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post(`/songs/${songId}/save`);
      return response.data;
    } catch (error: any) {
      console.error('Save song error:', error);
      throw error;
    }
  }

  async removeSongFromLibrary(songId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/songs/${songId}/save`);
      return response.data;
    } catch (error: any) {
      console.error('Remove song error:', error);
      throw error;
    }
  }

  async getSavedSongs(limit?: number, offset?: number): Promise<ApiResponse<{ songs: Song[]; pagination: any }>> {
    try {
      const response = await this.api.get('/songs/saved/list', {
        params: { limit, offset },
      });
      return response.data;
    } catch (error: any) {
      console.error('Get saved songs error:', error);
      throw error;
    }
  }

  // Practice endpoints
  async startPracticeSession(params: {
    song_id: string;
    session_type?: string;
    focus_techniques?: string[];
    tempo_percentage?: number;
    transposition_key?: string;
  }): Promise<ApiResponse<{ session_id: string; start_time: string; practice_settings: any }>> {
    try {
      const response = await this.api.post('/practice/start', params);
      return response.data;
    } catch (error: any) {
      console.error('Start practice session error:', error);
      throw error;
    }
  }

  async endPracticeSession(
    sessionId: string,
    params: {
      duration_seconds?: number;
      overall_accuracy?: number;
      timing_accuracy?: number;
      pitch_accuracy?: number;
      rhythm_accuracy?: number;
      user_rating?: number;
      session_notes?: string;
    }
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post(`/practice/end/${sessionId}`, params);
      return response.data;
    } catch (error: any) {
      console.error('End practice session error:', error);
      throw error;
    }
  }

  async submitPracticeAnalysis(
    sessionId: string,
    audioFile?: File,
    practiceNotes?: string
  ): Promise<ApiResponse<AnalysisResults>> {
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);

      if (audioFile) {
        formData.append('audio_file', audioFile);
      }

      if (practiceNotes) {
        formData.append('practice_notes', practiceNotes);
      }

      const response = await this.api.post('/practice/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Submit practice analysis error:', error);
      throw error;
    }
  }

  async getPracticeSessions(params?: {
    limit?: number;
    offset?: number;
    session_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<{ sessions: PracticeSession[]; pagination: any }>> {
    try {
      const response = await this.api.get('/practice/sessions', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get practice sessions error:', error);
      throw error;
    }
  }

  async getPracticeSession(sessionId: string): Promise<ApiResponse<PracticeSession>> {
    try {
      const response = await this.api.get(`/practice/sessions/${sessionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get practice session error:', error);
      throw error;
    }
  }

  async getPracticeStats(timeFrame?: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/practice/stats', {
        params: { timeFrame: timeFrame || '30d' },
      });
      return response.data;
    } catch (error: any) {
      console.error('Get practice stats error:', error);
      throw error;
    }
  }

  private getPlatform(): string {
    return Platform.OS;
  }

  private async getCurrentVersion(): Promise<string> {
    try {
      // Get app version from package.json or constants
      return '1.0.0'; // This should match your app version
    } catch (error) {
      console.warn('Could not get current version, using default');
      return '1.0.0';
    }
  }

  // Version check endpoint
  async checkAppVersion(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/version/check');
      
      // Ensure we have a proper response structure
      if (response.data && typeof response.data === 'object') {
        return {
          data: response.data,
          error: undefined
        };
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('App version check error:', error);
      return {
        data: null,
        error: {
          message: error.message || 'Version check failed',
          code: 'VERSION_CHECK_ERROR'
        }
      };
    }
  }

  // Version info endpoint
  async getVersionInfo(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/version/info');
      
      // Ensure we have a proper response structure
      if (response.data && typeof response.data === 'object') {
        return {
          data: response.data,
          error: undefined
        };
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('Get version info error:', error);
      return {
        data: null,
        error: {
          message: error.message || 'Failed to get version info',
          code: 'VERSION_INFO_ERROR'
        }
      };
    }
  }
}

export default new ApiService();