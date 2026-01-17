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

export const processYouTubeUrl = createAsyncThunk(
  'songs/processYouTubeUrl',
  async (youtubeUrl: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await ApiService.processYouTubeUrl(youtubeUrl);

      const jobId = response.data?.job_id;

      if (!jobId) {
        throw new Error('Failed to initiate processing');
      }

      // Start polling for status
      // In a more robust implementation, this would be handled via WebSockets or a Saga/Epic
      // For now we'll return the job ID and let the UI or a separate action handle polling
      return response;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to process YouTube URL';
      return rejectWithValue(errorMessage);
    }
  }
);

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
      if (state.currentProcessingJob === action.payload.jobId) {
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
        state.currentProcessingJob = action.payload.data?.job_id || null;
        state.processingStatus = 'processing'; // Initial status from backend
        state.processingProgress = 0;
      })
      .addCase(processYouTubeUrl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.processingStatus = 'failed';
      })
      .addCase(fetchJobStatus.fulfilled, (state, action) => {
        const data = action.payload.data;
        if (data && state.currentProcessingJob === data.job_id) {
          state.processingStatus = data.status as any;
          state.processingProgress = data.progress_percentage;

          if (data.status === 'completed' && data.partial_results) {
            const result = data.partial_results;
            const newSong: Song = {
              id: result.song_id || state.currentProcessingJob || '',
              title: result.title || 'Unknown Title',
              artist: result.artist || 'Unknown Artist',
              youtubeId: result.video_url?.split('v=')[1]?.split('&')[0] || '',
              videoUrl: result.video_url || '',
              duration: result.duration || 0,
              tempo: result.tempo || 120,
              key: result.key || 'C',
              chords: result.chords?.map((chord: any) => ({
                name: chord.name || chord.chord,
                startTime: chord.startTime || chord.start_time,
                duration: chord.duration,
                fingerPositions: chord.fingerPositions || [],
              })) || [],
              difficulty: result.difficulty || 3,
              processedAt: new Date().toISOString(),
            };
            state.songs.push(newSong);
          }
        }
      });
  },
});

export const { addSong, removeSong, updateProcessingStatus, clearError } = songsSlice.actions;

export default songsSlice.reducer;