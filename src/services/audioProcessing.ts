import { apiClient } from './api';

export interface ProcessingRequest {
  youtubeUrl: string;
  userPreferences?: {
    targetKey?: string;
    difficultyLevel?: number;
    includeTechniques?: string[];
  };
}

export interface ProcessingResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  results?: SongData;
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
  duration: number;
  video_url?: string;
  key: string;
  tempo: number;
  chords: ChordData[];
  difficulty: number;
  processed_at?: string;
}

export interface ChordData {
  name: string;
  startTime: number;
  duration: number;
  fingerPositions: FingerPosition[];
}

export interface FingerPosition {
  fret: number;
  string: number;
}

export interface ProcessingStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  current_step: string;
  estimated_remaining_seconds: number;
  partial_results?: Partial<SongData>;
}

export class AudioProcessingService {
  static async processYouTubeUrl(request: ProcessingRequest): Promise<ProcessingResponse> {
    const response = await apiClient.post('/api/process-youtube', request);
    return response.data;
  }

  static async getProcessingStatus(jobId: string): Promise<ProcessingStatus> {
    const response = await apiClient.post('/api/process-status', { jobId });
    return response.data;
  }

  static async getSongResults(songId: string): Promise<SongData> {
    const response = await apiClient.get(`/api/songs/${songId}`);
    return response.data;
  }

  static async pollJobStatus(jobId: string, onUpdate?: (status: ProcessingStatus) => void): Promise<SongData> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getProcessingStatus(jobId);
          onUpdate?.(status);
          
          if (status.status === 'completed') {
            if (status.partial_results) {
              resolve(status.partial_results as SongData);
            } else {
              const results = await this.getSongResults(jobId.replace('job_', 'song_'));
              resolve(results);
            }
          } else if (status.status === 'failed') {
            reject(new Error('Processing failed'));
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