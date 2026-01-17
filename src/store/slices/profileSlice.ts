import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import ApiService from '@/services/api';

interface UserProfile {
    user_id: string;
    email: string;
    username: string;
    display_name: string;
    skill_level: number;
    total_practice_time: number;
    songs_learned: number;
    consecutive_days: number;
    last_streak_date: string | null;
    total_sessions: number;
    avg_session_accuracy: number;
    last_practice_time: string | null;
}

interface PracticeSession {
    session_id: string;
    song_id: string;
    song_title: string;
    song_artist: string;
    duration_seconds: number;
    overall_accuracy: number;
    start_time: string;
}

interface ProfileState {
    user: UserProfile | null;
    history: PracticeSession[];
    loading: boolean;
    error: string | null;
}

const initialState: ProfileState = {
    user: null,
    history: [],
    loading: false,
    error: null,
};

export const fetchUserProfile = createAsyncThunk(
    'profile/fetchProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.api.get('/users/profile');
            const progressResponse = await ApiService.api.get('/users/progress');
            return { ...response.data, ...progressResponse.data };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
        }
    }
);

export const fetchPracticeHistory = createAsyncThunk(
    'profile/fetchHistory',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.api.get('/practice/sessions');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch practice history');
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'profile/updateProfile',
    async (updateData: Partial<UserProfile>, { rejectWithValue }) => {
        try {
            const response = await ApiService.api.put('/users/profile', updateData);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
        }
    }
);

const profileSlice = createSlice({
    name: 'profile',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchPracticeHistory.fulfilled, (state, action) => {
                state.history = action.payload;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                if (state.user) {
                    state.user = { ...state.user, ...action.payload };
                }
            });
    },
});

export default profileSlice.reducer;
