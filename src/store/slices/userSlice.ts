import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProgress } from '@/types/music';

interface UserState {
  currentUser: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  progress: UserProgress | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  progress: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{
      id: string;
      email: string;
      displayName: string;
    }>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    logout: (state) => {
      state.currentUser = null;
      state.progress = null;
      state.isAuthenticated = false;
    },
    updateProgress: (state, action: PayloadAction<Partial<UserProgress>>) => {
      if (state.progress) {
        state.progress = { ...state.progress, ...action.payload };
      } else {
        state.progress = {
          userId: state.currentUser?.id || '',
          totalPracticeTime: 0,
          songsLearned: 0,
          currentStreak: 0,
          skillLevel: 1,
          masteredTechniques: [],
          ...action.payload,
        };
      }
    },
    addPracticeTime: (state, action: PayloadAction<number>) => {
      if (state.progress) {
        state.progress.totalPracticeTime += action.payload;
      }
    },
    incrementSongsLearned: (state) => {
      if (state.progress) {
        state.progress.songsLearned += 1;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setUser,
  logout,
  updateProgress,
  addPracticeTime,
  incrementSongsLearned,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;