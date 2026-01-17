import { useState, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { ProgressService, StartPracticeRequest, PracticeAnalysisRequest } from '@/services/progressService';
import { PracticeSession } from '@/types/music';

interface UsePracticeSessionState {
  currentSession: PracticeSession | null;
  loading: boolean;
  error: string | null;
  sessionActive: boolean;
  startTime: Date | null;
  accuracy: number;
  notes: string;
}

interface UsePracticeSessionReturn extends UsePracticeSessionState {
  startSession: (songId: string, options?: Partial<StartPracticeRequest>) => Promise<void>;
  endSession: (analysisData?: FormData) => Promise<void>;
  addNote: (note: string) => void;
  reset: () => void;
}

export const usePracticeSession = (): UsePracticeSessionReturn => {
  const [state, setState] = useState<UsePracticeSessionState>({
    currentSession: null,
    loading: false,
    error: null,
    sessionActive: false,
    startTime: null,
    accuracy: 0,
    notes: '',
  });

  const updateState = useCallback((updates: Partial<UsePracticeSessionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setState({
      currentSession: null,
      loading: false,
      error: null,
      sessionActive: false,
      startTime: null,
      accuracy: 0,
      notes: '',
    });
  }, []);

  const startSession = useCallback(async (
    songId: string,
    options?: Partial<StartPracticeRequest>
  ) => {
    try {
      updateState({ loading: true, error: null });

      const request: StartPracticeRequest = {
        song_id: songId,
        session_type: options?.session_type || 'song_practice',
        focus_techniques: options?.focus_techniques || [],
        tempo_percentage: options?.tempo_percentage || 100,
        transposition_key: options?.transposition_key,
      };

      const response = await ProgressService.startPractice(request);
      const startTime = new Date();

      const newSession: PracticeSession = {
        id: response.session_id,
        songId: songId,
        startTime: startTime.toISOString(),
        endTime: undefined,
        accuracy: 0,
        chordsPlayed: 0,
        techniquesUsed: options?.focus_techniques || [],
        notes: '',
      };

      updateState({
        currentSession: newSession,
        loading: false,
        sessionActive: true,
        startTime: startTime,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start practice session';
      updateState({ error: errorMessage, loading: false });
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    }
  }, [updateState]);

  const endSession = useCallback(async (analysisData?: FormData) => {
    if (!state.currentSession || !state.startTime) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No active practice session',
      });
      return;
    }

    try {
      updateState({ loading: true });

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - state.startTime.getTime()) / 1000);

      // Submit practice analysis if data provided
      if (analysisData) {
        analysisData.append('session_id', state.currentSession.id);
        const analysis = await ProgressService.submitPracticeAnalysis(analysisData);

        updateState({
          accuracy: analysis.analysis_results.overall_accuracy,
        });
      }

      // Update session with end time and duration
      const updatedSession: PracticeSession = {
        ...state.currentSession,
        endTime: endTime.toISOString(),
        accuracy: state.accuracy,
        notes: state.notes,
      };

      updateState({
        currentSession: updatedSession,
        loading: false,
        sessionActive: false,
      });

      Toast.show({
        type: 'success',
        text1: 'Session Complete',
        text2: `Practice session completed! Overall accuracy: ${state.accuracy.toFixed(1)}%`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end practice session';
      updateState({ error: errorMessage, loading: false });
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    }
  }, [state.currentSession, state.startTime, state.accuracy, state.notes, updateState]);

  const addNote = useCallback((note: string) => {
    updateState({ notes: state.notes + (state.notes ? '\n' : '') + note });
  }, [state.notes, updateState]);

  return {
    ...state,
    startSession,
    endSession,
    addNote,
    reset,
  };
};

export default usePracticeSession;