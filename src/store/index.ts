import { configureStore } from '@reduxjs/toolkit';
import playerReducer from './slices/playerSlice';
import songsReducer from './slices/songsSlice';
import userReducer from './slices/userSlice';
import profileReducer from './slices/profileSlice';

export const store = configureStore({
  reducer: {
    player: playerReducer,
    songs: songsReducer,
    user: userReducer,
    profile: profileReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;