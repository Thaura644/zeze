# FRONTEND API CONFIGURATION CHECK
# This file documents all API endpoints and their mappings

## Base Configuration
```
Frontend: src/services/api.ts
Default URL: http://localhost:3001/api
Production URL: https://zeze-mz4n.onrender.com/api
Environment Variable: EXPO_PUBLIC_API_URL
```

## API Endpoint Mapping

### Authentication (/api/users)
| Frontend Function | Backend Route | Method | Auth Required |
|-------------------|---------------|--------|---------------|
| ApiService.login() | /users/login | POST | No |
| ApiService.register() | /users/register | POST | No |
| ApiService.logout() | /users/logout | POST | Yes |
| ApiService.refreshToken() | /users/refresh | POST | No |
| ApiService.getUserProfile() | /users/profile | GET | Yes |
| ApiService.updateUserProfile() | /users/profile | PUT | Yes |
| N/A | /users/progress | GET | Yes |
| N/A | /users/recommendations | GET | Yes |

### Songs (/api/songs)
| Frontend Function | Backend Route | Method | Auth Required |
|-------------------|---------------|--------|---------------|
| ApiService.searchSongs() | /songs/search | GET | Yes |
| ApiService.getSongById() | /songs/{songId} | GET | Yes |
| ApiService.getPopularSongs() | /songs/popular/list | GET | Yes |
| ApiService.getRecommendedSongs() | /songs/recommended/list | GET | Yes |
| ApiService.saveSongToLibrary() | /songs/{songId}/save | POST | Yes |
| ApiService.removeSongFromLibrary() | /songs/{songId}/save | DELETE | Yes |
| ApiService.getSavedSongs() | /songs/saved/list | GET | Yes |

### Practice (/api/practice)
| Frontend Function | Backend Route | Method | Auth Required |
|-------------------|---------------|--------|---------------|
| ApiService.startPracticeSession() | /practice/start | POST | Yes |
| ApiService.endPracticeSession() | /practice/end/{sessionId} | POST | Yes |
| ApiService.submitPracticeAnalysis() | /practice/analyze | POST | Yes |
| ApiService.getPracticeSessions() | /practice/sessions | GET | Yes |
| ApiService.getPracticeSession() | /practice/sessions/{sessionId} | GET | Yes |
| ApiService.getPracticeStats() | /practice/stats | GET | Yes |

### Audio Processing (Root /api)
| Frontend Function | Backend Route | Method | Auth Required |
|-------------------|---------------|--------|---------------|
| ApiService.uploadAudio() | /process-audio | POST | Yes |
| ApiService.processYouTubeUrl() | /process-youtube | POST | Yes |
| ApiService.getProcessingStatus() | /process-status/{jobId} | GET | Yes |
| ApiService.getSongResults() | /song-results/{jobId} | GET | Yes |
| ApiService.transposeSong() | /transpose | POST | Yes |
| ApiService.getTechniqueGuidance() | /techniques/{songId}/{timestamp} | GET | Yes |

### Version (/api/version)
| Frontend Function | Backend Route | Method | Auth Required |
|-------------------|---------------|--------|---------------|
| ApiService.checkAppVersion() | /version/check | POST | No |
| ApiService.getVersionInfo() | /version/info | GET | No |

## Redux Slice Mapping

### userSlice
- State: `currentUser`, `progress`, `isAuthenticated`, `loading`, `error`
- Actions: `setUser`, `logout`, `updateProgress`, `addPracticeTime`

### profileSlice  
- State: `user`, `history`, `loading`, `error`
- Async Thunks: `fetchUserProfile`, `fetchPracticeHistory`, `updateUserProfile`

### songsSlice
- State: `songs`, `currentProcessingJob`, `processingStatus`, `processingProgress`
- Async Thunks: `processYouTubeUrl`, `processAudioFile`, `fetchJobStatus`

### playerSlice
- State: `currentSong`, `loading`, `error`, playback state
- Actions: `loadSong`, `play`, `pause`, etc.

## Screen to Redux/API Mapping

### LoginScreen
- Uses: ApiService.login(), ApiService.register()
- State: `isLoggedIn` local state
- Navigates to: HomeScreen on success

### HomeScreen
- Uses: songsSlice (processYouTubeUrl, processAudioFile)
- Displays: songs list, learning roadmap
- Navigates to: ProfileScreen, PlayerScreen, LearningView

### ProfileScreen
- Uses: profileSlice (fetchUserProfile, fetchPracticeHistory, updateUserProfile)
- Displays: User info, stats, practice history

### PlayerScreen
- Uses: playerSlice (loadSong)
- Displays: ChordDisplay, TablatureView, UnifiedAudioPlayer
- Practice: startPracticeSession, endPracticeSession

### LearningView
- Uses: userSlice (progress data)
- Displays: Practice modes, skill library, quick exercises
- Navigates to: ExerciseGeneratorScreen (modal)

## Auth Token Flow

```
1. Login → POST /api/users/login
2. Response includes: { user, tokens: { accessToken, refreshToken } }
3. Store tokens in AsyncStorage via ApiService.setStoredTokens()
4. Axios interceptor adds Bearer token to all requests
5. 401 error → Clear tokens, redirect to login
6. Logout → POST /api/users/logout, clear AsyncStorage
```

