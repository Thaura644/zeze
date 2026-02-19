// Core music types for ZEZE app
export interface Chord {
  name: string;
  startTime: number;
  duration: number;
  fingerPositions: FingerPosition[];
  difficulty?: number;
}

export interface FingerPosition {
  fret: number;
  string: number; // 0-5 for 6 strings (E-A-D-G-B-e)
  finger?: number; // 1-4 for finger number
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  videoUrl: string;
  duration: number;
  tempo: number;
  key: string;
  chords: Chord[];
  difficulty: number;
  processedAt?: string;
  audioUrl?: string;
  offline_downloaded_at?: string;
}

export interface Technique {
  id: string;
  name: string;
  category: 'chord' | 'solo' | 'rhythm' | 'theory';
  difficulty: number;
  description: string;
  instructions: string[];
  commonMistakes: string[];
}

export interface PracticeSession {
  id: string;
  songId: string;
  startTime: string;
  endTime?: string;
  accuracy: number;
  chordsPlayed: number;
  techniquesUsed: string[];
  notes?: string;
}

export interface UserProgress {
  userId: string;
  totalPracticeTime: number;
  songsLearned: number;
  currentStreak: number;
  skillLevel: number;
  masteredTechniques: string[];
}