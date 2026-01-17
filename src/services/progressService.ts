import { apiClient } from './api';

export interface PracticeSession {
  session_id: string;
  user_id: string;
  song_id?: string;
  session_type: 'song_practice' | 'technique_drill' | 'free_practice';
  focus_techniques: string[];
  tempo_percentage: number;
  transposition_key?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  overall_accuracy?: number;
  timing_accuracy?: number;
  pitch_accuracy?: number;
  rhythm_accuracy?: number;
  chord_accuracy?: Record<string, ChordAccuracy>;
  mistakes?: Mistake[];
  improvement_areas?: string[];
  notes_played?: number;
  chords_played?: number;
  techniques_used?: string[];
  user_rating?: number;
  user_feedback?: string;
  session_notes?: string;
}

export interface ChordAccuracy {
  accuracy: number;
  mistakes: number;
}

export interface Mistake {
  timestamp: number;
  type: 'chord_mistake' | 'timing' | 'pitch' | 'rhythm';
  description?: string;
  expected?: string;
  played?: string;
  severity: 'minor' | 'major';
}

export interface StartPracticeRequest {
  song_id: string;
  session_type?: 'song_practice' | 'technique_drill' | 'free_practice';
  focus_techniques?: string[];
  tempo_percentage?: number;
  transposition_key?: string;
}

export interface StartPracticeResponse {
  session_id: string;
  start_time: string;
  practice_settings: {
    metronome_enabled: boolean;
    loop_section?: { start: number; end: number };
    difficulty_adjustments: {
      simplify_chords: boolean;
      slow_tempo: boolean;
    };
  };
}

export interface PracticeAnalysisRequest {
  session_id: string;
  audio_file: File;
  practice_notes?: string;
}

export interface PracticeAnalysisResponse {
  analysis_results: {
    overall_accuracy: number;
    timing_accuracy: number;
    pitch_accuracy: number;
    rhythm_accuracy: number;
    chord_accuracy: Record<string, ChordAccuracy>;
    mistakes: Mistake[];
    improvement_areas: string[];
    next_practice_suggestions: {
      focus_techniques: string[];
      recommended_tempo: number;
      practice_exercises: string[];
    };
  };
}

export interface UserProgress {
  user_id: string;
  total_practice_time: number;
  songs_learned: number;
  consecutive_days: number;
  last_streak_date?: string;
  skill_level: number;
  techniques_mastered: string[];
  average_accuracy: number;
  recent_sessions: PracticeSession[];
  achievements: Achievement[];
}

export interface Achievement {
  achievement_id: string;
  name: string;
  description: string;
  icon_url?: string;
  unlocked_at: string;
  category: string;
}

export class ProgressService {
  static async startPractice(request: StartPracticeRequest): Promise<StartPracticeResponse> {
    const response = await apiClient.post('/api/practice/start', request);
    return response.data;
  }

  static async submitPracticeAnalysis(request: FormData): Promise<PracticeAnalysisResponse> {
    const response = await apiClient.post('/api/practice/analyze', request, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  static async getUserProgress(userId: string): Promise<UserProgress> {
    const response = await apiClient.get(`/api/users/${userId}/progress`);
    return response.data;
  }

  static async getPracticeSessions(userId: string, limit = 10): Promise<PracticeSession[]> {
    const response = await apiClient.get(`/api/users/${userId}/sessions?limit=${limit}`);
    return response.data;
  }

  static async getSessionDetails(sessionId: string): Promise<PracticeSession> {
    const response = await apiClient.get(`/api/practice/sessions/${sessionId}`);
    return response.data;
  }
}

export default ProgressService;