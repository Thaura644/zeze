// API types for ZEZE app
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ProcessYouTubeRequest {
  youtubeUrl: string;
  userPreferences?: {
    targetKey?: string;
    difficultyLevel?: number;
  };
}

export interface ProcessYouTubeResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedCompletion?: string;
  processingSteps?: ProcessingStep[];
}

export interface ProcessingStep {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
}

export interface ProcessingStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progressPercentage: number;
  currentStep: string;
  estimatedRemainingSeconds?: number;
  partialResults?: PartialProcessingResults;
}

export interface PartialProcessingResults {
  tempo?: number;
  key?: string;
  timeSignature?: string;
  duration?: number;
}

export interface SongResults {
  songId: string;
  metadata: {
    title: string;
    artist: string;
    duration: number;
    originalKey: string;
    tempoBpm: number;
    overallDifficulty: number;
  };
  chordProgression: ChordData[];
  tablature: TablatureData;
  techniques: TechniqueData[];
}

export interface ChordData {
  chord: string;
  startTime: number;
  duration: number;
  fingering: FingerPosition[];
}

export interface TablatureData {
  tuning: string[];
  notes: TabNote[];
}

export interface TabNote {
  string: number;
  fret: number;
  time: number;
  duration: number;
}

export interface TechniqueData {
  technique: string;
  sections: string[];
  timestamp?: number;
}