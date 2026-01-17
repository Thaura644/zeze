import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '@/types/music';
import ApiService from '@/services/api';

interface SongsState {
  songs: Song[];
  currentProcessingJob: string | null;
  processingStatus: 'idle' | 'processing' | 'completed' | 'failed';
  processingProgress: number;
  loading: boolean;
  error: string | null;
}

const initialState: SongsState = {
  songs: [],
  currentProcessingJob: null,
  processingStatus: 'idle',
  processingProgress: 0,
  loading: false,
  error: null,
};

const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLLS = 60; // 3 minutes total

export const processYouTubeUrl = createAsyncThunk(
  'songs/processYouTubeUrl',
  async (youtubeUrl: string, { rejectWithValue, dispatch }) => {
    try {
      const initResponse = await ApiService.processYouTubeUrl(youtubeUrl);
      const jobId = initResponse.data?.job_id;

      if (!jobId) {
        throw new Error('Failed to initiate processing');
      }

      // If it's already completed (cached), return immediately
      if (initResponse.data?.status === 'completed') {
        return initResponse.data;
      }

      return await pollJobStatus(jobId, dispatch);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to process YouTube URL';
      return rejectWithValue(errorMessage);
    }
  }
);

export const processAudioFile = createAsyncThunk(
  'songs/processAudioFile',
  async (file: any, { rejectWithValue, dispatch }) => {
    try {
      const initResponse = await ApiService.uploadAudio(file);
      const jobId = initResponse.data?.job_id;

      if (!jobId) {
        throw new Error('Failed to initiate upload/processing');
      }

      // If it's already completed (cached/instant), return immediately
      if (initResponse.data?.status === 'completed') {
        return initResponse.data;
      }

      return await pollJobStatus(jobId, dispatch);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to process audio file';
      return rejectWithValue(errorMessage);
    }
  }
);

const pollJobStatus = async (jobId: string, dispatch: any) => {
  // Initial polling state
  dispatch(updateProcessingStatus({ jobId, status: 'processing', progress: 0 }));

  // Polling logic
  let pollCount = 0;
  while (pollCount < MAX_POLLS) {
    const statusResponse = await ApiService.getProcessingStatus(jobId);
    const data = statusResponse.data;

    if (!data) throw new Error('Failed to get processing status');

    dispatch(updateProcessingStatus({
      jobId,
      status: data.status as any,
      progress: data.progress_percentage
    }));

    if (data.status === 'completed') {
      // If completed, get the final results
      const resultsResponse = await ApiService.getSongResults(jobId);
      return resultsResponse.data;
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'Processing failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    pollCount++;
  }

  throw new Error('Processing timed out. Please check back later.');
};

export const fetchJobStatus = createAsyncThunk(
  'songs/fetchJobStatus',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const response = await ApiService.getProcessingStatus(jobId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const songsSlice = createSlice({
  name: 'songs',
  initialState,
  reducers: {
    addSong: (state, action: PayloadAction<Song>) => {
      state.songs.push(action.payload);
    },
    removeSong: (state, action: PayloadAction<string>) => {
      state.songs = state.songs.filter(song => song.id !== action.payload);
    },
    updateProcessingStatus: (state, action: PayloadAction<{
      jobId: string;
      status: 'processing' | 'completed' | 'failed';
      progress?: number;
    }>) => {
      if (state.currentProcessingJob === action.payload.jobId || !state.currentProcessingJob) {
        state.currentProcessingJob = action.payload.jobId;
        state.processingStatus = action.payload.status;
        if (action.payload.progress !== undefined) {
          state.processingProgress = action.payload.progress;
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(processYouTubeUrl.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.processingStatus = 'processing';
      })
      .addCase(processYouTubeUrl.fulfilled, (state, action) => {
        state.loading = false;
        state.processingStatus = 'completed';
        state.processingProgress = 100;

        if (action.payload && action.payload.results) {
          const result = action.payload.results;
          const newSong: Song = {
            id: result.song_id || state.currentProcessingJob || '',
            title: result.metadata?.title || 'Unknown Title',
            artist: result.metadata?.artist || 'Unknown Artist',
            youtubeId: result.metadata?.video_url?.split('v=')[1]?.split('&')[0] || '',
            videoUrl: result.metadata?.video_url || '',
            duration: result.metadata?.duration || 0,
            tempo: result.metadata?.tempo_bpm || 120,
            key: result.metadata?.original_key || 'C',
            chords: result.chords?.map((chord: any) => ({
              name: chord.chord || chord.name,
              startTime: chord.start_time || chord.startTime,
              duration: chord.duration,
              fingerPositions: chord.fingerPositions || [],
            })) || [],
            difficulty: result.metadata?.overall_difficulty || 3,
            processedAt: new Date().toISOString(),
          };

          // Only add if not already in list
          if (!state.songs.find(s => s.id === newSong.id)) {
            state.songs.push(newSong);
          }
        }
      })
      .addCase(processYouTubeUrl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.processingStatus = 'failed';
      })
      .addCase(processAudioFile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.processingStatus = 'processing';
      })
      .addCase(processAudioFile.fulfilled, (state, action) => {
        state.loading = false;
        state.processingStatus = 'completed';
        state.processingProgress = 100;

        if (action.payload && action.payload.results) {
          const result = action.payload.results;
          const newSong: Song = {
            id: result.song_id || state.currentProcessingJob || '',
            title: result.metadata?.title || 'Unknown Title',
            artist: result.metadata?.artist || 'Unknown Artist',
            youtubeId: result.metadata?.video_url?.split('v=')[1]?.split('&')[0] || '',
            videoUrl: result.metadata?.video_url || '',
            duration: result.metadata?.duration || 0,
            tempo: result.metadata?.tempo_bpm || 120,
            key: result.metadata?.original_key || 'C',
            chords: result.chords?.map((chord: any) => ({
              name: chord.chord || chord.name,
              startTime: chord.start_time || chord.startTime,
              duration: chord.duration,
              fingerPositions: chord.fingerPositions || [],
            })) || [],
            difficulty: result.metadata?.overall_difficulty || 3,
            processedAt: new Date().toISOString(),
          };

          if (!state.songs.find(s => s.id === newSong.id)) {
            state.songs.push(newSong);
          }
        }
      })
      .addCase(processAudioFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.processingStatus = 'failed';
      })
      .addCase(fetchJobStatus.fulfilled, (state, action) => {
        const data = action.payload.data;
        if (data && state.currentProcessingJob === data.job_id) {
          state.processingStatus = data.status as any;
          state.processingProgress = data.progress_percentage;
        }
      });
  },
});

export const { addSong, removeSong, updateProcessingStatus, clearError } = songsSlice.actions;

export default songsSlice.reducer;