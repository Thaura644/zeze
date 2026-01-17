import { apiClient } from './api';

export interface TranspositionRequest {
  songId: string;
  targetKey: string;
  preserveFingering?: boolean;
}

export interface TranspositionResponse {
  transposed_data: {
    new_key: string;
    capo_position?: number;
    chord_progression: TransposedChord[];
    tablature: any; // Define tablature type as needed
  };
}

export interface TransposedChord {
  original_chord: string;
  transposed_chord: string;
  fingering: any; // Define fingering type as needed
}

export interface TechniqueGuidance {
  technique: {
    name: string;
    category: string;
    difficulty: number;
    description: string;
    instructions: string[];
    common_mistakes: string[];
    tips: string[];
    video_url?: string;
  };
  context: {
    chord: string;
    measure: number;
    beat: number;
    fingering_suggestion?: any;
  };
}

export class LearningService {
  static async transposeSong(request: TranspositionRequest): Promise<TranspositionResponse> {
    const response = await apiClient.post('/api/transpose', request);
    return response.data;
  }

  static async getTechniqueGuidance(songId: string, timestamp: number): Promise<TechniqueGuidance> {
    const response = await apiClient.get(`/api/techniques/${songId}/${timestamp}`);
    return response.data;
  }

  static async getAllTechniques(): Promise<Technique[]> {
    const response = await apiClient.get('/api/techniques');
    return response.data;
  }

  static async getTechniqueById(techniqueId: string): Promise<Technique> {
    const response = await apiClient.get(`/api/techniques/${techniqueId}`);
    return response.data;
  }
}

export interface Technique {
  technique_id: string;
  name: string;
  slug: string;
  category: string;
  subcategory?: string;
  difficulty_level: number;
  description: string;
  instructions: string[];
  common_mistakes: string[];
  tips: string[];
  finger_positions?: any;
  picking_patterns?: any;
  fretboard_positions?: any;
  video_url?: string;
  audio_example_url?: string;
  diagram_url?: string;
  popularity_score: number;
  usage_count: number;
}

export default LearningService;