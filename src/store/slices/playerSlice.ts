import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '@/types/music';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentChordIndex: number;
  playbackSpeed: number;
  loading: boolean;
  error: string | null;
}

const initialState: PlayerState = {
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  currentChordIndex: -1,
  playbackSpeed: 1.0,
  loading: false,
  error: null,
};

export const play = createAsyncThunk(
  'player/play',
  async (_, { getState }) => {
    const state = getState() as { player: PlayerState };
    if (!state.player.currentSong) {
      throw new Error('No song loaded');
    }
    return Promise.resolve();
  }
);

export const pause = createAsyncThunk(
  'player/pause',
  async () => {
    return Promise.resolve();
  }
);

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
      // Update current chord based on time
      if (state.currentSong) {
        const currentChordIndex = state.currentSong.chords.findIndex(
          chord =>
            state.currentTime >= chord.startTime &&
            state.currentTime < chord.startTime + chord.duration
        );
        state.currentChordIndex = currentChordIndex !== -1 ? currentChordIndex : -1;
      }
    },
    setDuration: (state, action: PayloadAction<number>) => {
      if (!isNaN(action.payload)) {
        state.duration = action.payload;
      }
    },
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },
    nextChord: (state) => {
      if (state.currentSong && state.currentChordIndex < state.currentSong.chords.length - 1) {
        state.currentChordIndex += 1;
        state.currentTime = state.currentSong.chords[state.currentChordIndex]?.startTime || state.currentTime;
      }
    },
    previousChord: (state) => {
      if (state.currentSong && state.currentChordIndex > 0) {
        state.currentChordIndex -= 1;
        state.currentTime = state.currentSong.chords[state.currentChordIndex]?.startTime || state.currentTime;
      }
    },
    seekTo: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },
    loadSong: (state, action: PayloadAction<Song>) => {
      state.currentSong = action.payload;
      state.currentTime = 0;
      state.currentChordIndex = -1;
      state.duration = action.payload.duration;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(play.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(play.fulfilled, (state) => {
        state.loading = false;
        state.isPlaying = true;
      })
      .addCase(play.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to play';
      })
      .addCase(pause.fulfilled, (state) => {
        state.isPlaying = false;
      });
  },
});

export const {
  setCurrentTime,
  setDuration,
  setPlaybackSpeed,
  nextChord,
  previousChord,
  seekTo,
  loadSong,
  clearError,
} = playerSlice.actions;

export default playerSlice.reducer;