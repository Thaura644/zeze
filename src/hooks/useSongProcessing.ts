import { useState, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { AudioProcessingService, ProcessingRequest, ProcessingResponse } from '@/services/audioProcessing';
import { Song } from '@/types/music';

interface UseSongProcessingState {
  loading: boolean;
  error: string | null;
  jobId: string | null;
  progress: number;
  currentStep: string;
  results: Song | null;
}

interface UseSongProcessingReturn extends UseSongProcessingState {
  processYouTubeUrl: (url: string, preferences?: ProcessingRequest['userPreferences']) => Promise<void>;
  reset: () => void;
  pollJobStatus: (jobId: string) => Promise<void>;
}

export const useSongProcessing = (): UseSongProcessingReturn => {
  const [state, setState] = useState<UseSongProcessingState>({
    loading: false,
    error: null,
    jobId: null,
    progress: 0,
    currentStep: '',
    results: null,
  });

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      jobId: null,
      progress: 0,
      currentStep: '',
      results: null,
    });
  }, []);

  const updateState = useCallback((updates: Partial<UseSongProcessingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const processYouTubeUrl = useCallback(async (
    url: string,
    preferences?: ProcessingRequest['userPreferences']
  ) => {
    try {
      updateState({ loading: true, error: null });

      const request: ProcessingRequest = {
        youtubeUrl: url,
        userPreferences: preferences || {
          targetKey: 'C',
          difficultyLevel: 3,
        },
      };

      const response: ProcessingResponse = await AudioProcessingService.processYouTubeUrl(request);

      if (response.status === 'completed' && response.results) {
        const results = response.results;
        const song: Song = {
          id: results.song_id,
          title: results.metadata.title,
          artist: results.metadata.artist,
          youtubeId: '', // Extract from URL if needed
          videoUrl: results.metadata.video_url || '',
          duration: results.metadata.duration,
          tempo: results.metadata.tempo_bpm,
          key: results.metadata.original_key,
          chords: results.chords.map(chord => ({
            name: chord.chord,
            startTime: chord.start_time,
            duration: chord.duration,
            fingerPositions: chord.fingerPositions || [],
          })),
          difficulty: results.metadata.overall_difficulty,
          processedAt: new Date(results.processed_at || Date.now()).toISOString(),
        };

        updateState({
          results: song,
          loading: false,
          progress: 100,
          currentStep: 'completed',
        });

        return;
      }

      updateState({ jobId: response.job_id });

      // Start polling for job status
      if (response.job_id) {
        await pollJobStatus(response.job_id);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process song';
      updateState({ error: errorMessage, loading: false });
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    }
  }, [updateState]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const status = await AudioProcessingService.pollJobStatus(
        jobId,
        (statusUpdate) => {
          updateState({
            progress: statusUpdate.progress_percentage,
            currentStep: statusUpdate.current_step,
          });
        }
      );

      const results = status;
      const song: Song = {
        id: results.song_id || jobId.replace('job_', 'song_'),
        title: results.metadata?.title || results.title || 'Unknown Title',
        artist: results.metadata?.artist || results.artist || 'Unknown Artist',
        youtubeId: '', // Extract from URL if needed
        videoUrl: results.metadata?.video_url || results.video_url || '',
        duration: results.metadata?.duration || results.duration || 0,
        tempo: results.metadata?.tempo_bpm || results.tempo || 120,
        key: results.metadata?.original_key || results.key || 'C',
        chords: (results.chords || []).map((chord: any) => ({
          name: chord.chord || chord.name,
          startTime: chord.start_time || chord.startTime,
          duration: chord.duration,
          fingerPositions: chord.fingerPositions || [],
        })),
        difficulty: results.metadata?.overall_difficulty || results.difficulty || 3,
        processedAt: new Date().toISOString(),
      };

      updateState({
        results: song,
        loading: false,
        progress: 100,
        currentStep: 'completed',
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      updateState({ error: errorMessage, loading: false });
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    }
  }, [updateState]);

  return {
    ...state,
    processYouTubeUrl,
    reset,
    pollJobStatus,
  };
};

export default useSongProcessing;