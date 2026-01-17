import ApiService from './api';

export interface ProcessingRequest {
  youtubeUrl: string;
  userPreferences?: {
    targetKey?: string;
    difficultyLevel?: number;
    includeTechniques?: string[];
  };
}

export interface AudioFileProcessingRequest {
  file: any; // React Native file object
  userPreferences?: {
    targetKey?: string;
    difficultyLevel?: number;
    includeTechniques?: string[];
  };
}

export interface ProcessingResponse {
  job_id: string;
  status: string;
  results?: {
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
    chords: Array<{
      chord: string;
      start_time: number;
      duration: number;
      confidence?: number;
      fingerPositions?: Array<{
        string: number;
        fret: number;
      }>;
    }>;
    tablature: {
      tuning: string[];
      notes: Array<{
        string: number;
        fret: number;
        time: number;
        duration: number;
        chord?: string;
      }>;
    };
    techniques: Array<{
      technique: string;
      sections: string[];
    }>;
    processed_at: string;
  };
  estimated_completion?: string;
  processing_steps?: ProcessingStep[];
}

export interface ProcessingStep {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface SongData {
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
  chords?: Array<{
    chord: string;
    start_time: number;
    duration: number;
  }>;
  tablature?: {
    tuning: string[];
    notes: Array<{
      string: number;
      fret: number;
      time: number;
      duration: number;
    }>;
  };
  is_saved?: boolean;
}

export interface ProcessingStatus {
  job_id: string;
  status: string;
  progress_percentage: number;
  current_step: string;
  estimated_remaining_seconds?: number;
  partial_results?: any;
}

export class AudioProcessingService {
  static async processYouTubeUrl(request: ProcessingRequest): Promise<any> {
    const response = await ApiService.processYouTubeUrl(request.youtubeUrl, request.userPreferences);
    return response.data;
  }

  static async uploadAudioFile(request: AudioFileProcessingRequest): Promise<any> {
    const response = await ApiService.uploadAudio(request.file, request.userPreferences);
    return response.data;
  }

  static async getProcessingStatus(jobId: string): Promise<any> {
    const response = await ApiService.getProcessingStatus(jobId);
    return response.data;
  }

  static async getSongResults(songId: string): Promise<any> {
    const response = await ApiService.getSongById(songId);
    return response.data;
  }

  static async pollJobStatus(jobId: string, onUpdate?: (status: any) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getProcessingStatus(jobId);
          onUpdate?.(status);

          if (status.status === 'completed') {
            if (status.results) {
              resolve(status.results);
            } else {
              // For completed jobs, get the full results
              const results = await this.getSongResults(jobId.replace('job_', 'song_'));
              resolve(results);
            }
          } else if (status.status === 'failed') {
            reject(new Error(status.error || 'Processing failed'));
          } else {
            setTimeout(poll, 2000); // Poll every 2 seconds
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }
}

export default AudioProcessingService;