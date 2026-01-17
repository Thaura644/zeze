import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
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
        const song: Song = {
          id: response.results.song_id,
          title: response.results.title,
          artist: response.results.artist,
          youtubeId: '', // Extract from URL if needed
          videoUrl: response.results.video_url || '',
          duration: response.results.duration,
          tempo: response.results.tempo,
          key: response.results.key,
          chords: response.results.chords.map(chord => ({
            name: chord.name,
            startTime: chord.startTime,
            duration: chord.duration,
            fingerPositions: chord.fingerPositions,
          })),
          difficulty: response.results.difficulty,
          processedAt: new Date(response.results.processed_at || Date.now()),
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
      Alert.alert('Error', errorMessage);
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

      const song: Song = {
        id: jobId.replace('job_', 'song_'),
        title: status.title,
        artist: status.artist,
        youtubeId: '', // Extract from URL if needed
        videoUrl: status.video_url || '',
        duration: status.duration,
        tempo: status.tempo,
        key: status.key,
        chords: status.chords.map(chord => ({
          name: chord.name,
          startTime: chord.startTime,
          duration: chord.duration,
          fingerPositions: chord.fingerPositions,
        })),
        difficulty: status.difficulty,
        processedAt: new Date(),
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
      Alert.alert('Error', errorMessage);
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