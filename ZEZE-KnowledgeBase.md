# ZEZE - Knowledge Base

## Table of Contents
- [Project Overview](#project-overview)
- [Technical Architecture](#technical-architecture)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Development Guidelines](#development-guidelines)
- [Deployment & Operations](#deployment--operations)
- [Business & Product](#business--product)
- [Missing Information](#missing-information)

---

## Project Overview

### Executive Summary
ZEZE is a mobile application that teaches all guitar techniques and transposition skills for any song in any key (6-string guitar only). The app processes YouTube URLs or local audio files to provide interactive learning experiences with real-time chord detection, technique guidance, and progress tracking.

### Core Value Proposition
- **Universal Learning**: Learn any song, any key, any technique
- **AI-Powered**: Real-time audio analysis and personalized instruction
- **Progress Tracking**: Comprehensive skill development analytics
- **Interactive Experience**: Visual fretboard with synchronized playback

### Target Market
- **Primary**: Beginner to intermediate guitar players (18-45 years)
- **Secondary**: Advanced players seeking technique refinement
- **Tertiary**: Music teachers and students

### Success Metrics
- Chord detection accuracy >95%
- Processing time <90 seconds for both YouTube and local files
- App load time <3 seconds
- Audio file upload success rate >98%
- User retention >60% after 30 days
- 10,000+ MAU within first quarter

### Input Methods
- **YouTube Integration**: Direct URL processing with YouTube Data API v3
- **Local Audio Upload**: Full support for MP3, WAV, OGG, M4A, FLAC files up to 50MB
- **Real-time Processing**: Background job queuing with progress tracking
- **Error Handling**: Comprehensive validation and user feedback

### Learning & Progress System
- **Structured Learning Path**: 7 major categories with 50+ skills from beginner to advanced
- **Skill Categories**: Getting Started, Chords & Transitions, Rhythm & Timing, Music Theory, Soloing & Lead Guitar, Technique Mastery, Song Learning
- **In-App Learning**: Direct navigation from song playback to skill tutorials
- **Progress Tracking**: Prerequisites and difficulty levels for guided learning
- **Song-Based Learning**: Skills dropdown shows techniques needed for current song
- **Caching System**: Local song data caching for instant replay (24-hour expiry)

---

## Technical Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (MOBILE APP)                      │
├─────────────────────────────────────────────────────────────┤
│  React Native (Expo) / Flutter                              │
│  - Real-time audio/video player (React Native Video)        │
│  - Interactive fretboard (Canvas/SVG)                       │
│  - Gesture recognition (React Native Gesture Handler)       │
│  - Offline cache (AsyncStorage)                             │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP/WebSocket
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY                             │
│  Cloudflare Workers / AWS API Gateway                       │
│  - Request routing & rate limiting                          │
│  - Authentication (JWT tokens)                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
┌──────────────┐┌──────────────┐┌──────────────┐
│   AUDIO      ││  TECHNIQUE   ││   PROGRESS   │
│ PROCESSING   ││   ENGINE     ││   ANALYTICS  │
│   SERVICE    ││   SERVICE    ││   SERVICE    │
├──────────────┤├──────────────┤├──────────────┤
│ Python FastAPI││ Node.js      ││ Go (Gin)     │
│ - YouTube DL  ││ - GPT-4 API  ││ - TimescaleDB│
│ - FFmpeg      ││ - Claude API ││ - Redis      │
│ - S3 Storage  ││ - Vector DB  ││ - Webhooks   │
└──────┬───────┘└──────┬───────┘└──────┬───────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                 PRE-TRAINED MODELS (CLOUD)                  │
├─────────────────────────────────────────────────────────────┤
│  1. Chord Detection: Spotify Basic Pitch                   │
│  2. Note Transcription: Google's Onsets & Frames           │
│  3. Tab Generation: GuitarPro Parser + GPT-4               │
│  4. Beat Tracking: Librosa                                 │
│  5. Key Detection: Krumhansl-Schmuckler Algorithm          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend (Mobile)
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **UI Components**: React Native Elements / NativeBase
- **Navigation**: React Navigation 6
- **Media**: React Native Video, React Native Audio, expo-document-picker
- **Graphics**: React Native SVG, Skia (for fretboard)
- **Storage**: AsyncStorage, SQLite (for offline)
- **File Handling**: expo-document-picker for audio file uploads

#### Backend Services
- **API Gateway**: AWS API Gateway / Cloudflare Workers
- **Audio Processing**: Python + FastAPI
- **AI Services**: Node.js + Express
- **User Service**: Go + Gin
- **Database**: PostgreSQL + TimescaleDB
- **Cache**: Redis
- **File Storage**: AWS S3
- **Queue**: AWS SQS / Redis Queue

#### AI/ML Models
- **Chord Detection**: Spotify Basic Pitch (pre-trained)
- **Note Transcription**: Google's Onsets & Frames
- **Tab Generation**: GPT-4 + Custom Rules Engine
- **Beat Tracking**: Librosa
- **Key Detection**: Krumhansl-Schmuckler Algorithm
- **Technique Classification**: Fine-tuned YAMNet

#### Infrastructure
- **Cloud**: AWS (primary) + GCP (fallback)
- **Containerization**: Docker + Kubernetes (EKS)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana + CloudWatch
- **Logging**: ELK Stack
- **CDN**: CloudFront

### Component Architecture

#### Mobile App Components
```
┌─────────────────────────────────────┐
│ User Interface Components            │
├─────────────────────────────────────┤
│ Song Input Component                │
│ ├── YouTube URL Parser              │
│ └── Local Audio File Uploader       │
│     ├── Document Picker Integration │
│     ├── Format Validation           │
│     └── Progress Tracking           │
│                                     │
│ Player Interface                    │
│ ├── Video/Audio Player              │
│ ├── Playback Controls               │
│ └── Progress Bar                    │
│                                     │
│ Fretboard Component                 │
│ ├── SVG Fretboard Renderer          │
│ ├── Touch Interaction               │
│ └── Note Highlighter                │
│                                     │
│ Chord Display                       │
│ ├── Chord Diagram Generator         │
│ └── Finger Positioning              │
│                                     │
│ Progress Dashboard                  │
│ ├── Session Analytics               │
│ ├── Skill Matrix                    │
│ └── Achievement Display             │
└─────────────────────────────────────┘
```

#### Business Logic Layer
```
┌─────────────────────────────────────┐
│ Business Logic Layer                │
├─────────────────────────────────────┤
│ Audio Processing Manager            │
│ ├── Job Queue Handler               │
│ └── Processing Pipeline             │
│                                     │
│ Learning Engine                     │
│ ├── Technique Matcher               │
│ ├── Difficulty Calculator           │
│ └── Practice Recommender            │
│                                     │
│ Transposition Engine                │
│ ├── Key Change Calculator           │
│ ├── Fingering Optimizer             │
│ └── Capo Positioner                 │
│                                     │
│ Progress Tracker                    │
│ ├── Accuracy Calculator             │
│ ├── Mistake Detector               │
│ └── Skill Leveler                   │
└─────────────────────────────────────┘
```

### Data Flow Architecture

#### Audio Processing Pipeline
```
Start → Input Choice → Processing Pipeline → Aggregation → Storage → Display

Input Types:
├── YouTube URL
│   ├── Extract Video ID
│   ├── Get Metadata via YouTube Data API v3
│   ├── Download Audio via yt-dlp
│   └── Convert to 30s WAV Sample
└── Local Audio File
    ├── File Selection via Document Picker
    ├── Client-side Format Validation (MP3, WAV, OGG, M4A, FLAC)
    ├── Multipart Upload to Backend
    ├── Server-side Processing and Analysis
    └── Extract 30s Sample for Analysis

Processing Pipeline (Parallel):
├── Beat & Tempo Detection → Beat Grid
├── Key & Scale Detection → Key Signature
├── Chord Progression Detection → Chord Sequence
└── Note Transcription → MIDI Notes

Aggregation:
├── Synchronize All Timelines
├── Generate Tablature
├── Calculate Difficulty Score
├── Identify Techniques
└── Generate Practice Sections
```

---

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    hashed_password VARCHAR(255),
    auth_provider VARCHAR(20) DEFAULT 'email',
    provider_id VARCHAR(255),
    
    -- User Preferences
    skill_level INTEGER DEFAULT 1,
    preferred_genres VARCHAR(100)[] DEFAULT '{}',
    practice_goal VARCHAR(50),
    daily_reminder_time TIME,
    notify_on_completion BOOLEAN DEFAULT true,
    
    -- Device & Session Info
    current_device_id VARCHAR(255),
    last_ip_address INET,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Subscription
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    
    -- Analytics
    total_practice_time INTEGER DEFAULT 0,
    songs_learned INTEGER DEFAULT 0,
    consecutive_days INTEGER DEFAULT 0,
    last_streak_date DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT skill_level_range CHECK (skill_level BETWEEN 1 AND 10)
);
```

#### Songs Table
```sql
CREATE TABLE songs (
    song_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id VARCHAR(20) UNIQUE,
    spotify_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    release_year INTEGER,
    duration_seconds INTEGER NOT NULL,
    
    -- Audio Analysis Results
    original_key VARCHAR(5),
    tempo_bpm DECIMAL(5,2),
    time_signature VARCHAR(10),
    energy_level DECIMAL(3,2),
    valence DECIMAL(3,2),
    
    -- Processing Metadata
    chord_progression JSONB,
    note_sequence JSONB,
    beat_grid JSONB,
    sections JSONB,
    techniques_identified JSONB,
    
    -- Difficulty Scoring
    overall_difficulty DECIMAL(3,2),
    chord_difficulty DECIMAL(3,2),
    solo_difficulty DECIMAL(3,2),
    rhythm_difficulty DECIMAL(3,2),
    speed_difficulty DECIMAL(3,2),
    
    -- Audio Files
    original_audio_url VARCHAR(500),
    processed_audio_url VARCHAR(500),
    waveform_data JSONB,
    
    -- Processing Status
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_progress INTEGER DEFAULT 0,
    processing_errors TEXT[],
    
    -- Cached Data
    thumbnail_url VARCHAR(500),
    popularity_score DECIMAL(5,2),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    
    CONSTRAINT difficulty_range CHECK (overall_difficulty BETWEEN 0.0 AND 10.0)
);
```

#### Practice Sessions Table
```sql
CREATE TABLE practice_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(song_id) ON DELETE SET NULL,
    user_song_id UUID REFERENCES user_songs(user_song_id) ON DELETE CASCADE,
    
    -- Session Info
    session_type VARCHAR(20) DEFAULT 'song_practice',
    focus_techniques VARCHAR(50)[],
    tempo_percentage INTEGER DEFAULT 100,
    transposition_key VARCHAR(5),
    
    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Performance Metrics
    overall_accuracy DECIMAL(5,2),
    timing_accuracy DECIMAL(5,2),
    pitch_accuracy DECIMAL(5,2),
    rhythm_accuracy DECIMAL(5,2),
    
    -- Detailed Metrics
    chord_accuracy JSONB,
    section_accuracy JSONB,
    mistakes JSONB,
    improvement_areas JSONB,
    
    -- Session Stats
    notes_played INTEGER,
    chords_played INTEGER,
    techniques_used JSONB,
    max_speed_bpm DECIMAL(5,2),
    avg_speed_bpm DECIMAL(5,2),
    
    -- User Feedback
    user_rating INTEGER,
    user_feedback TEXT,
    session_notes TEXT,
    
    -- Device Info
    device_type VARCHAR(50),
    app_version VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT accuracy_check CHECK (overall_accuracy BETWEEN 0.0 AND 100.0),
    CONSTRAINT rating_check CHECK (user_rating BETWEEN 1 AND 5)
);
```

### Supporting Tables

#### Techniques Table
```sql
CREATE TABLE techniques (
    technique_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    
    -- Difficulty & Metadata
    difficulty_level INTEGER NOT NULL,
    prerequisite_techniques UUID[],
    related_techniques UUID[],
    
    -- Instructional Content
    description TEXT NOT NULL,
    instructions JSONB,
    common_mistakes TEXT[],
    tips TEXT[],
    
    -- Visual Guides
    finger_positions JSONB,
    picking_patterns JSONB,
    fretboard_positions JSONB,
    notation_example TEXT,
    
    -- Media
    video_url VARCHAR(500),
    audio_example_url VARCHAR(500),
    diagram_url VARCHAR(500),
    
    -- Usage Stats
    popularity_score DECIMAL(5,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT difficulty_range CHECK (difficulty_level BETWEEN 1 AND 10)
);
```

#### Chords Table
```sql
CREATE TABLE chords (
    chord_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    notation VARCHAR(10) NOT NULL,
    root_note VARCHAR(5) NOT NULL,
    chord_type VARCHAR(20) NOT NULL,
    intervals INTEGER[],
    
    -- Fingering Variations
    basic_fingering JSONB,
    alternative_fingerings JSONB[],
    barre_positions INTEGER[],
    capo_positions JSONB,
    
    -- Difficulty
    difficulty_level INTEGER,
    common_progressions JSONB,
    
    -- Theory
    scale_relationship VARCHAR(100)[],
    notes VARCHAR(50)[],
    roman_numeral VARCHAR(10),
    
    -- Usage Stats
    popularity_score DECIMAL(5,2) DEFAULT 0.0,
    usage_frequency INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(notation, root_note, chord_type)
);
```

### Views & Functions

#### User Progress Summary View
```sql
CREATE VIEW user_progress_summary AS
SELECT 
    u.user_id,
    u.email,
    u.username,
    u.skill_level,
    u.total_practice_time,
    u.songs_learned,
    u.consecutive_days,
    
    -- Aggregated Stats
    COUNT(DISTINCT us.song_id) as total_songs_saved,
    COUNT(DISTINCT ps.session_id) as total_sessions,
    AVG(ps.overall_accuracy) as avg_session_accuracy,
    SUM(ps.duration_seconds) as total_practice_time_calculated,
    
    -- Recent Activity
    MAX(ps.start_time) as last_practice_time,
    COUNT(DISTINCT ps.session_id) FILTER (WHERE ps.start_time >= NOW() - INTERVAL '7 days') as sessions_last_7_days,
    
    -- Technique Mastery
    COUNT(DISTINCT st.technique_id) as techniques_attempted,
    COUNT(DISTINCT up.mastered_techniques) as techniques_mastered
    
FROM users u
LEFT JOIN user_songs us ON u.user_id = us.user_id
LEFT JOIN practice_sessions ps ON u.user_id = ps.user_id
LEFT JOIN song_techniques st ON us.song_id = st.song_id
LEFT JOIN user_progress up ON u.user_id = up.user_id
GROUP BY u.user_id, u.email, u.username, u.skill_level, u.total_practice_time, u.songs_learned, u.consecutive_days;
```

### TimescaleDB Configuration

#### Hypertables for Time-Series Data
```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert practice_sessions to hypertable
SELECT create_hypertable(
    'practice_sessions', 
    'start_time',
    chunk_time_interval => INTERVAL '1 week',
    create_default_indexes => FALSE
);

-- Convert system_logs to hypertable
SELECT create_hypertable(
    'system_logs', 
    'created_at',
    chunk_time_interval => INTERVAL '1 day',
    create_default_indexes => FALSE
);
```

---

## API Documentation

### Core Endpoints

#### Audio Processing Service

##### Process Local Audio File
```http
POST /api/process-audio
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

Form Data:
- audio_file: <binary_audio_data> (MP3, WAV, OGG, M4A, FLAC)
- user_preferences: {"target_key": "C", "difficulty_level": 3} (optional)
```

**Supported Formats:**
- MP3, WAV, OGG, M4A, FLAC
- Maximum file size: 50MB

**Response:**
```json
{
  "job_id": "uuid-v4",
  "status": "queued",
  "estimated_completion": "2024-01-01T12:05:00Z",
  "processing_steps": [
    {"step": "upload", "status": "completed"},
    {"step": "validation", "status": "pending"},
    {"step": "audio_analysis", "status": "pending"},
    {"step": "chord_detection", "status": "pending"},
    {"step": "tab_generation", "status": "pending"}
  ]
}
```

##### Process YouTube URL
```http
POST /api/process-youtube
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "user_preferences": {
    "target_key": "C",
    "difficulty_level": 3
  }
}
```

**Response:**
```json
{
  "job_id": "uuid-v4",
  "status": "queued",
  "estimated_completion": "2024-01-01T12:05:00Z",
  "processing_steps": [
    {"step": "download", "status": "pending"},
    {"step": "audio_analysis", "status": "pending"},
    {"step": "chord_detection", "status": "pending"},
    {"step": "tab_generation", "status": "pending"}
  ]
}
```

##### Get Processing Status
```http
GET /api/process-status/{job_id}
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "job_id": "uuid-v4",
  "status": "processing",
  "progress_percentage": 65,
  "current_step": "chord_detection",
  "estimated_remaining_seconds": 30,
  "partial_results": {
    "tempo": 120,
    "key": "G major",
    "time_signature": "4/4"
  }
}
```

##### Get Processed Results
```http
GET /api/song-results/{job_id}
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "song_id": "uuid-v4",
  "metadata": {
    "title": "Wonderwall",
    "artist": "Oasis",
    "duration": 258,
    "original_key": "G major",
    "tempo_bpm": 86.5,
    "overall_difficulty": 3.2
  },
  "chord_progression": [
    {"chord": "G", "start_time": 0.0, "duration": 3.5},
    {"chord": "D", "start_time": 3.5, "duration": 1.5},
    {"chord": "Em", "start_time": 5.0, "duration": 2.0},
    {"chord": "C", "start_time": 7.0, "duration": 2.0}
  ],
  "tablature": {
    "tuning": ["E", "A", "D", "G", "B", "E"],
    "notes": [
      {"string": 3, "fret": 0, "time": 0.0, "duration": 0.5},
      {"string": 4, "fret": 2, "time": 0.0, "duration": 0.5}
    ]
  },
  "techniques": [
    {"technique": "strumming", "sections": ["intro", "verse", "chorus"]},
    {"technique": "fingerpicking", "sections": ["bridge"]}
  ]
}
```

#### Learning Service

##### Transpose Song
```http
POST /api/transpose
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "song_id": "uuid-v4",
  "target_key": "C major",
  "preserve_fingering": true
}
```

**Response:**
```json
{
  "transposed_data": {
    "new_key": "C major",
    "capo_position": 7,
    "chord_progression": [
      {"original_chord": "G", "transposed_chord": "C", "fingering": {...}},
      {"original_chord": "D", "transposed_chord": "G", "fingering": {...}}
    ],
    "tablature": {...}
  }
}
```

##### Get Technique Guidance
```http
GET /api/techniques/{song_id}/{timestamp}
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "technique": {
    "name": "Hammer-on",
    "category": "solo",
    "difficulty": 3,
    "description": "Sound a note by hammering finger onto fret",
    "instructions": [
      "Place finger on lower fret",
      "Strike the note",
      "Quickly hammer higher fret finger"
    ],
    "common_mistakes": [
      "Not hammering firmly enough",
      "Timing the hammer incorrectly"
    ],
    "video_url": "https://cdn.example.com/hammer-on.mp4"
  },
  "context": {
    "chord": "G",
    "measure": 12,
    "beat": 2,
    "fingering_suggestion": {
      "index_fret": 2,
      "middle_fret": 4,
      "string": 4
    }
  }
}
```

#### Progress Service

##### Start Practice Session
```http
POST /api/practice/start
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "song_id": "uuid-v4",
  "session_type": "song_practice",
  "focus_techniques": ["strumming", "chord_changes"],
  "tempo_percentage": 75,
  "transposition_key": "G"
}
```

**Response:**
```json
{
  "session_id": "uuid-v4",
  "start_time": "2024-01-01T12:00:00Z",
  "practice_settings": {
    "metronome_enabled": true,
    "loop_section": {"start": 0.0, "end": 30.0},
    "difficulty_adjustments": {
      "simplify_chords": false,
      "slow_tempo": true
    }
  }
}
```

##### Submit Practice Analysis
```http
POST /api/practice/analyze
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

session_id: uuid-v4
audio_file: <binary_audio_data>
practice_notes: "Struggled with F chord transition"
```

**Response:**
```json
{
  "analysis_results": {
    "overall_accuracy": 78.5,
    "timing_accuracy": 82.0,
    "pitch_accuracy": 75.0,
    "rhythm_accuracy": 78.5,
    "chord_accuracy": {
      "G": {"accuracy": 85.0, "mistakes": 2},
      "D": {"accuracy": 72.0, "mistakes": 5},
      "Em": {"accuracy": 80.0, "mistakes": 3}
    },
    "mistakes": [
      {"timestamp": 12.5, "type": "chord_mistake", "expected": "F", "played": "F7"},
      {"timestamp": 25.3, "type": "timing", "description": "late beat by 200ms"}
    ],
    "improvement_areas": [
      "F chord finger positioning",
      "Chord transition timing",
      "Strumming pattern consistency"
    ],
    "next_practice_suggestions": {
      "focus_techniques": ["barre_chords", "chord_transitions"],
      "recommended_tempo": 60,
      "practice_exercises": ["f-chord-drill", "g-f-transition"]
    }
  }
}
```

### WebSocket Events

#### Real-time Processing Updates
```javascript
// Connect to WebSocket
const ws = new WebSocket('wss://api.guitarmaster.ai/ws/processing');

// Subscribe to job updates
ws.send(JSON.stringify({
  type: 'subscribe',
  job_id: 'uuid-v4',
  token: 'jwt_token'
}));

// Receive updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  /*
  {
    "type": "progress_update",
    "job_id": "uuid-v4",
    "progress_percentage": 45,
    "current_step": "chord_detection",
    "message": "Analyzing chord progression...",
    "partial_results": {
      "tempo_detected": true,
      "tempo_bpm": 120
    }
  }
  */
};
```

#### Real-time Practice Feedback
```javascript
// Connect to practice session WebSocket
const practiceWs = new WebSocket('wss://api.guitarmaster.ai/ws/practice');

practiceWs.send(JSON.stringify({
  type: 'join_session',
  session_id: 'uuid-v4',
  token: 'jwt_token'
}));

// Receive real-time feedback
practiceWs.onmessage = (event) => {
  const feedback = JSON.parse(event.data);
  /*
  {
    "type": "realtime_feedback",
    "timestamp": 12.5,
    "current_chord": "G",
    "accuracy": 85.0,
    "mistake_detected": {
      "type": "pitch",
      "severity": "minor",
      "description": "Slightly sharp on G string"
    },
    "encouragement": "Great timing! Keep your wrist relaxed."
  }
  */
};
```

---

## Development Guidelines

### Code Standards

#### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/services/*": ["src/services/*"],
      "@/utils/*": ["src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
```

#### ESLint Configuration
```json
{
  "extends": [
    "@react-native-community",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "react-native/no-inline-styles": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Component Patterns

#### Base Component Structure
```typescript
// src/components/Fretboard/Fretboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { Chord, Note, Technique } from '@/types/music';
import { updateFretboardPosition } from '@/store/slices/playerSlice';
import { useAudioSync } from '@/hooks/useAudioSync';

interface FretboardProps {
  chords: Chord[];
  currentChordIndex: number;
  techniques: Technique[];
  onChordPress: (chord: Chord) => void;
  onTechniquePress: (technique: Technique) => void;
  isInteractive: boolean;
}

export const Fretboard: React.FC<FretboardProps> = ({
  chords,
  currentChordIndex,
  techniques,
  onChordPress,
  onTechniquePress,
  isInteractive,
}) => {
  const dispatch = useDispatch();
  const { currentTime, isPlaying } = useSelector(state => state.player);
  
  const [selectedStrings, setSelectedStrings] = useState<number[]>([]);
  const [fretboardPosition, setFretboardPosition] = useState(0);

  // Custom hook for audio synchronization
  const { syncPosition } = useAudioSync({
    currentTime,
    chords,
    onChordChange: (chordIndex) => {
      // Handle chord change
    },
  });

  // Memoized fretboard calculations
  const fretboardData = useMemo(() => {
    return calculateFretboardPositions(chords, techniques);
  }, [chords, techniques]);

  // Pan responder for touch interactions
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: () => isInteractive,
      onPanResponderGrant: (evt) => {
        // Handle touch start
      },
      onPanResponderMove: (evt, gestureState) => {
        // Handle touch move
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Handle touch end
      },
    });
  }, [isInteractive]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Fretboard rendering implementation */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B4513',
  },
});
```

#### Custom Hook Pattern
```typescript
// src/hooks/useAudioSync.ts
import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Chord } from '@/types/music';
import { setCurrentChord } from '@/store/slices/playerSlice';

interface UseAudioSyncProps {
  currentTime: number;
  chords: Chord[];
  onChordChange: (chordIndex: number) => void;
  tolerance?: number; // seconds
}

export const useAudioSync = ({
  currentTime,
  chords,
  onChordChange,
  tolerance = 0.1,
}: UseAudioSyncProps) => {
  const dispatch = useDispatch();
  const previousChordIndex = useRef<number>(-1);

  const syncPosition = useCallback(() => {
    const currentChordIndex = chords.findIndex(
      (chord, index) => 
        currentTime >= chord.startTime - tolerance &&
        currentTime < chord.startTime + chord.duration
    );

    if (currentChordIndex !== -1 && currentChordIndex !== previousChordIndex.current) {
      previousChordIndex.current = currentChordIndex;
      onChordChange(currentChordIndex);
      dispatch(setCurrentChord(chords[currentChordIndex]));
    }
  }, [currentTime, chords, tolerance, onChordChange, dispatch]);

  useEffect(() => {
    syncPosition();
  }, [syncPosition]);

  return {
    syncPosition,
    currentChordIndex: previousChordIndex.current,
  };
};
```

### State Management Patterns

#### Redux Slice Structure
```typescript
// src/store/slices/playerSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { Song, Chord, Technique } from '@/types/music';
import { playerAPI } from '@/services/api';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentChordIndex: number;
  playbackSpeed: number;
  transpositionKey: string;
  loopSection: { start: number; end: number } | null;
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
  transpositionKey: '',
  loopSection: null,
  loading: false,
  error: null,
};

// Async thunks
export const loadSong = createAsyncThunk(
  'player/loadSong',
  async (songId: string, { rejectWithValue }) => {
    try {
      const response = await playerAPI.getSong(songId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const transposeSong = createAsyncThunk(
  'player/transposeSong',
  async ({ songId, targetKey }: { songId: string; targetKey: string }) => {
    const response = await playerAPI.transposeSong(songId, targetKey);
    return response.data;
  }
);

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    play: (state) => {
      state.isPlaying = true;
    },
    pause: (state) => {
      state.isPlaying = false;
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },
    setLoopSection: (state, action: PayloadAction<{ start: number; end: number } | null>) => {
      state.loopSection = action.payload;
    },
    nextChord: (state) => {
      if (state.currentSong && state.currentChordIndex < state.currentSong.chords.length - 1) {
        state.currentChordIndex += 1;
      }
    },
    previousChord: (state) => {
      if (state.currentChordIndex > 0) {
        state.currentChordIndex -= 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSong.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSong.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSong = action.payload;
        state.duration = action.payload.duration;
        state.currentChordIndex = 0;
      })
      .addCase(loadSong.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(transposeSong.fulfilled, (state, action) => {
        if (state.currentSong) {
          state.currentSong = { ...state.currentSong, ...action.payload };
        }
      });
  },
});

export const {
  play,
  pause,
  setCurrentTime,
  setPlaybackSpeed,
  setLoopSection,
  nextChord,
  previousChord,
} = playerSlice.actions;

export default playerSlice.reducer;
```

### Testing Guidelines

#### Unit Testing Pattern
```typescript
// src/components/Fretboard/__tests__/Fretboard.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { Fretboard } from '../Fretboard';
import { playerSlice } from '@/store/slices/playerSlice';
import { Chord, Technique } from '@/types/music';

const mockChords: Chord[] = [
  { name: 'G', startTime: 0, duration: 2, fingering: {} },
  { name: 'C', startTime: 2, duration: 2, fingering: {} },
];

const mockTechniques: Technique[] = [
  { id: '1', name: 'Strumming', category: 'rhythm', difficulty: 1 },
];

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      player: playerSlice.reducer,
    },
    preloadedState: initialState,
  });
};

const renderWithProvider = (component: React.ReactElement, initialState = {}) => {
  const store = createMockStore(initialState);
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

describe('Fretboard Component', () => {
  const mockOnChordPress = jest.fn();
  const mockOnTechniquePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with chords', () => {
    const { getByTestId } = renderWithProvider(
      <Fretboard
        chords={mockChords}
        currentChordIndex={0}
        techniques={mockTechniques}
        onChordPress={mockOnChordPress}
        onTechniquePress={mockOnTechniquePress}
        isInteractive={true}
      />
    );

    expect(getByTestId('fretboard')).toBeTruthy();
    expect(getByTestId('chord-G')).toBeTruthy();
  });

  it('handles chord press when interactive', async () => {
    const { getByTestId } = renderWithProvider(
      <Fretboard
        chords={mockChords}
        currentChordIndex={0}
        techniques={mockTechniques}
        onChordPress={mockOnChordPress}
        onTechniquePress={mockOnTechniquePress}
        isInteractive={true}
      />
    );

    const chordElement = getByTestId('chord-G');
    fireEvent.press(chordElement);

    await waitFor(() => {
      expect(mockOnChordPress).toHaveBeenCalledWith(mockChords[0]);
    });
  });

  it('does not handle press when not interactive', () => {
    const { getByTestId } = renderWithProvider(
      <Fretboard
        chords={mockChords}
        currentChordIndex={0}
        techniques={mockTechniques}
        onChordPress={mockOnChordPress}
        onTechniquePress={mockOnTechniquePress}
        isInteractive={false}
      />
    );

    const chordElement = getByTestId('chord-G');
    fireEvent.press(chordElement);

    expect(mockOnChordPress).not.toHaveBeenCalled();
  });

  it('updates current chord display based on props', () => {
    const { rerender, getByTestId } = renderWithProvider(
      <Fretboard
        chords={mockChords}
        currentChordIndex={0}
        techniques={mockTechniques}
        onChordPress={mockOnChordPress}
        onTechniquePress={mockOnTechniquePress}
        isInteractive={true}
      />
    );

    expect(getByTestId('current-chord').props.children).toBe('G');

    rerender(
      <Provider store={createMockStore()}>
        <Fretboard
          chords={mockChords}
          currentChordIndex={1}
          techniques={mockTechniques}
          onChordPress={mockOnChordPress}
          onTechniquePress={mockOnTechniquePress}
          isInteractive={true}
        />
      </Provider>
    );

    expect(getByTestId('current-chord').props.children).toBe('C');
  });
});
```

#### Integration Testing Pattern
```typescript
// src/__tests__/integration/SongProcessing.integration.test.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';

import { useSongProcessing } from '@/hooks/useSongProcessing';
import { store } from '@/store';

const mockServer = setupServer(
  rest.post('/api/process-youtube', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        job_id: 'test-job-id',
        status: 'queued',
        estimated_completion: '2024-01-01T12:05:00Z',
      })
    );
  }),
  rest.get('/api/process-status/:jobId', (req, res, ctx) => {
    const { jobId } = req.params;
    if (jobId === 'test-job-id') {
      return res(
        ctx.status(200),
        ctx.json({
          job_id: 'test-job-id',
          status: 'completed',
          progress_percentage: 100,
          results: {
            song_id: 'test-song-id',
            chords: [
              { name: 'G', startTime: 0, duration: 2 },
              { name: 'C', startTime: 2, duration: 2 },
            ],
          },
        })
      );
    }
    return res(ctx.status(404));
  })
);

describe('Song Processing Integration', () => {
  beforeAll(() => mockServer.listen());
  afterEach(() => mockServer.resetHandlers());
  afterAll(() => mockServer.close());

  it('processes YouTube URL end-to-end', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result, waitForNextUpdate } = renderHook(
      () => useSongProcessing(),
      { wrapper }
    );

    // Start processing
    act(() => {
      result.current.processYouTubeUrl('https://youtube.com/watch?v=test');
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.jobId).toBe('test-job-id');

    // Wait for completion
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.results).toBeDefined();
    expect(result.current.results.chords).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });
});
```

### Performance Guidelines

#### React Native Optimization
```typescript
// Use React.memo for component optimization
export const ChordDiagram = React.memo<ChordDiagramProps>(({ chord, isHighlighted }) => {
  return (
    <View style={styles.container}>
      {/* Chord diagram implementation */}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.chord.name === nextProps.chord.name &&
    prevProps.isHighlighted === nextProps.isHighlighted
  );
});

// Use useMemo for expensive calculations
const Fretboard: React.FC<FretboardProps> = ({ chords }) => {
  const fretPositions = useMemo(() => {
    return chords.map(chord => calculateFretPositions(chord));
  }, [chords]);

  return <View>{/* Render fretboard */}</View>;
};

// Use useCallback for stable function references
const PlayerControls: React.FC<PlayerControlsProps> = ({ onPlay, onPause }) => {
  const handlePlayPress = useCallback(() => {
    onPlay();
  }, [onPlay]);

  const handlePausePress = useCallback(() => {
    onPause();
  }, [onPause]);

  return (
    <View>
      <Button title="Play" onPress={handlePlayPress} />
      <Button title="Pause" onPress={handlePausePress} />
    </View>
  );
};
```

#### Image and Asset Optimization
```typescript
// Lazy load images
import FastImage from 'react-native-fast-image';

const TechniqueImage: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  return (
    <FastImage
      style={styles.image}
      source={{
        uri: imageUrl,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
      }}
      resizeMode={FastImage.resizeMode.contain}
    />
  );
};

// Optimize SVG rendering
import { Svg, Path } from 'react-native-svg';

const OptimizedFretboard: React.FC = () => {
  const fretboardPath = useMemo(() => {
    // Pre-calculate SVG path data
    return 'M0,0 L100,0 L100,50 L0,50 Z'; // Simplified example
  }, []);

  return (
    <Svg width={300} height={200}>
      <Path d={fretboardPath} fill="#8B4513" />
    </Svg>
  );
};
```

---

## Deployment & Operations

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  build-mobile:
    runs-on: macos-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build iOS
        run: expo build:ios --non-interactive
        env:
          EXPO_APPLE_ID: ${{ secrets.EXPO_APPLE_ID }}
          EXPO_APPLE_ID_PASSWORD: ${{ secrets.EXPO_APPLE_ID_PASSWORD }}
      
      - name: Build Android
        run: expo build:android --non-interactive
        env:
          EXPO_ANDROID_KEYSTORE_BASE64: ${{ secrets.EXPO_ANDROID_KEYSTORE_BASE64 }}
          EXPO_ANDROID_KEYSTORE_ALIAS: ${{ secrets.EXPO_ANDROID_KEYSTORE_ALIAS }}
          EXPO_ANDROID_KEYSTORE_PASSWORD: ${{ secrets.EXPO_ANDROID_KEYSTORE_PASSWORD }}
          EXPO_ANDROID_KEY_PASSWORD: ${{ secrets.EXPO_ANDROID_KEY_PASSWORD }}

  build-backend:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [build-mobile, build-backend]
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to staging
        run: |
          # Deploy backend services
          kubectl apply -f k8s/staging/
          
          # Update mobile app (if using Expo updates)
          expo publish --release-channel staging
      
      - name: Run smoke tests
        run: npm run test:smoke -- --env=staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: [build-mobile, build-backend]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Deploy backend services with rolling update
          kubectl apply -f k8s/production/
          kubectl rollout status deployment/api-service
          
          # Update mobile app
          expo publish --release-channel production
      
      - name: Run health checks
        run: npm run test:health -- --env=production
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Kubernetes Configuration

#### Backend Service Deployment
```yaml
# k8s/production/api-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: guitarmaster
  labels:
    app: api-service
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
        version: v1
    spec:
      containers:
      - name: api-service
        image: ghcr.io/your-org/guitarmaster-api:latest
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        - name: S3_BUCKET
          value: guitarmaster-audio
        - name: AWS_REGION
          value: us-east-1
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: temp-storage
          mountPath: /tmp
      volumes:
      - name: temp-storage
        emptyDir:
          sizeLimit: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: guitarmaster
spec:
  selector:
    app: api-service
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: guitarmaster
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.guitarmaster.ai
    secretName: api-tls
  rules:
  - host: api.guitarmaster.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

#### Audio Processing Service
```yaml
# k8s/production/audio-processor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: audio-processor
  namespace: guitarmaster
spec:
  replicas: 2
  selector:
    matchLabels:
      app: audio-processor
  template:
    metadata:
      labels:
        app: audio-processor
    spec:
      containers:
      - name: audio-processor
        image: ghcr.io/your-org/guitarmaster-audio:latest
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: S3_BUCKET
          value: guitarmaster-audio
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-access-key
        - name: SPOTIFY_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: spotify-credentials
              key: client-id
        - name: SPOTIFY_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: spotify-credentials
              key: client-secret
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: audio-cache
          mountPath: /cache
      volumes:
      - name: audio-cache
        persistentVolumeClaim:
          claimName: audio-cache-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: audio-cache-pvc
  namespace: guitarmaster
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: fast-ssd
```

### Monitoring & Observability

#### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'api-service'
    static_configs:
      - targets: ['api-service:8080']
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: 'audio-processor'
    static_configs:
      - targets: ['audio-processor:8080']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

#### Alert Rules
```yaml
# monitoring/alert_rules.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighMemoryUsage
        expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

  - name: audio_processing_alerts
    rules:
      - alert: ProcessingQueueBacklog
        expr: redis_queue_length > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Audio processing queue backlog"
          description: "Queue has {{ $value }} jobs pending"

      - alert: ProcessingFailureRate
        expr: rate(audio_processing_failures_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High audio processing failure rate"
          description: "Failure rate is {{ $value | humanizePercentage }}"

  - name: database_alerts
    rules:
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "{{ $value }} active connections"

      - alert: DatabaseDiskSpaceHigh
        expr: (pg_database_size_bytes / 1024 / 1024 / 1024) > 50
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Database disk space high"
          description: "Database size is {{ $value }}GB"
```

#### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "ZEZE - Production Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Seconds"
          }
        ]
      },
      {
        "title": "Audio Processing Queue",
        "type": "stat",
        "targets": [
          {
            "expr": "redis_queue_length",
            "legendFormat": "Queue Length"
          }
        ]
      },
      {
        "title": "Processing Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(audio_processing_success_total[5m]) / (rate(audio_processing_success_total[5m]) + rate(audio_processing_failures_total[5m]))",
            "legendFormat": "Success Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 0.9},
                {"color": "green", "value": 0.95}
              ]
            }
          }
        }
      },
      {
        "title": "Active Users",
        "type": "graph",
        "targets": [
          {
            "expr": "active_users_total",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "Active Connections"
          },
          {
            "expr": "rate(pg_stat_database_xact_commit_total[5m])",
            "legendFormat": "Commits/sec"
          }
        ]
      }
    ]
  }
}
```

### Security Configuration

#### Network Policies
```yaml
# k8s/security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: guitarmaster-network-policy
  namespace: guitarmaster
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  - from:
    - podSelector:
        matchLabels:
          app: api-service
    ports:
    - protocol: TCP
      port: 5432
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: api-service
    ports:
    - protocol: TCP
      port: 5432
  - to: []
    ports:
    - protocol: TCP
      port: 53
      port: 443
      port: 80
```

#### Pod Security Policy
```yaml
# k8s/security/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: guitarmaster-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

---

## Business & Product

### User Personas

#### Primary Persona: "Alex the Beginner"
- **Age**: 25
- **Skill Level**: Complete beginner (0-6 months)
- **Goals**: Learn favorite songs, build foundation
- **Pain Points**: 
  - Can't find songs at appropriate difficulty
  - Struggles with chord transitions
  - Lacks structured learning path
- **Usage Pattern**: 15-30 minutes daily, evening practice
- **Features Needed**:
  - Simplified chord versions
  - Slow tempo practice
  - Visual finger positioning
  - Progress tracking with milestones

#### Secondary Persona: "Jordan the Intermediate"
- **Age**: 32
- **Skill Level**: 2-3 years experience
- **Goals**: Learn solos, improve technique, play in any key
- **Pain Points**:
  - Hit plateau with basic techniques
  - Can't play along with original recordings
  - Limited to open chords and basic keys
- **Usage Pattern**: 30-45 minutes, 3-4 times per week
- **Features Needed**:
  - Advanced technique breakdown
  - Transposition tools
  - Speed building exercises
  - Song difficulty recommendations

#### Tertiary Persona: "Morgan the Teacher"
- **Age**: 28
- **Skill Level**: Advanced (5+ years)
- **Role**: Guitar instructor
- **Goals**: Tools for student instruction, curriculum development
- **Pain Points**:
  - Creating custom exercises takes time
  - Tracking student progress manually
  - Finding appropriate songs for different skill levels
- **Usage Pattern**: Daily, multiple sessions
- **Features Needed**:
  - Student progress dashboards
  - Custom exercise creation
  - Curriculum sharing
  - Analytics and reporting

### Feature Prioritization

#### MVP Features (Must Have)
1. **YouTube URL Processing**
   - Audio extraction
   - Chord detection
   - Basic tablature generation

2. **Interactive Player**
   - Synchronized playback
   - Chord highlighting
   - Tempo control

3. **Basic Progress Tracking**
   - Practice session logging
   - Accuracy measurement
   - Simple analytics

4. **Core UI Components**
   - Song library
   - Player interface
   - Settings

#### V1.1 Features (Should Have)
1. **Enhanced Learning**
   - Technique guidance
   - Finger positioning animations
   - Practice recommendations

2. **Transposition Tools**
   - Key changing
   - Capo positioning
   - Alternative chord voicings

3. **Social Features**
   - Progress sharing
   - Achievement badges
   - Community challenges

#### V2.0 Features (Nice to Have)
1. **Advanced AI**
   - Real-time mistake detection
   - Personalized learning paths
   - AI guitar teacher (voice)

2. **Hardware Integration**
   - Smart guitar connectivity
   - MIDI controller support
   - Audio interface integration

3. **Professional Tools**
   - Recording capabilities
   - Backing track generation
   - Music theory lessons

### Monetization Strategy

#### Freemium Model
```
Free Tier (Limited):
- Process 5 songs per month
- Basic chord detection
- Standard tempo playback
- Simple progress tracking

Premium Tier ($9.99/month):
- Unlimited song processing
- Advanced technique analysis
- Transposition tools
- Detailed progress analytics
- Offline mode
- Priority processing

Pro Tier ($19.99/month):
- All Premium features
- Real-time feedback
- Custom exercise generation
- Student management tools
- API access
```

#### B2B Offering
```
Music Schools:
- Student management dashboard
- Curriculum creation tools
- Bulk licensing
- White-label options

Content Creators:
- Affiliate program
- Co-marketing opportunities
- Featured content placement

Hardware Partners:
- Integration with smart guitars
- Bundled software offerings
- Co-development opportunities
```

### Marketing & Growth Strategy

#### User Acquisition Channels
1. **Content Marketing**
   - YouTube tutorials (song breakdowns)
   - Blog posts (guitar tips, technique guides)
   - Social media (Instagram Reels, TikTok)

2. **Partnerships**
   - Guitar influencers
   - Music schools
   - Gear manufacturers

3. **App Store Optimization**
   - Keyword optimization ("guitar lessons", "chord detection")
   - Compelling screenshots and videos
   - Positive review management

4. **Community Building**
   - Discord server
   - Reddit community
   - User-generated content contests

#### Retention Strategies
1. **Gamification**
   - Daily streaks
   - Achievement badges
   - Leaderboards
   - Challenge modes

2. **Personalization**
   - Adaptive difficulty
   - Customized practice plans
   - Goal setting and tracking
   - Progress celebrations

3. **Community Features**
   - Share progress
   - Collaborative challenges
   - User-generated content
   - Peer feedback system

### Success Metrics & KPIs

#### Product Metrics
- **User Engagement**: Daily active users, session duration, songs processed
- **Learning Effectiveness**: Skill progression, accuracy improvement, completion rates
- **Feature Adoption**: Transposition usage, technique practice, social features
- **Retention**: Day 1, 7, 30 retention rates, churn analysis

#### Business Metrics
- **Revenue**: MRR, ARPU, LTV, conversion rates
- **Growth**: User acquisition cost, viral coefficient, market penetration
- **Operational**: Processing costs, server costs, support ticket volume

#### Technical Metrics
- **Performance**: App load time, processing speed, API response time
- **Reliability**: Uptime, error rates, crash rates
- **Scalability**: Concurrent users, queue processing capacity, database performance

---

## Implementation Status

### ✅ Completed Features
- **Backend API**: Full REST API with authentication, audio processing, and database integration
- **YouTube Processing**: Complete YouTube URL processing with metadata extraction
- **Local Audio Upload**: Production-ready local file upload with format validation and progress tracking
- **Real-time Processing**: Background job queuing with WebSocket progress updates
- **Frontend UI**: Complete React Native app with navigation, state management, and UI components
- **Database Schema**: Comprehensive PostgreSQL schema with TimescaleDB for time-series data
- **Authentication**: JWT-based authentication with secure password handling
- **File Storage**: AWS S3 integration for audio file storage
- **Monitoring**: Prometheus/Grafana setup for system monitoring
- **Learning Roadmap**: Comprehensive guitar learning path with 50+ skills across 7 categories
- **Skill Navigation**: In-app skill learning with dropdown access from Player screen
- **Song Caching**: Local caching for faster song replay and offline access

### 🔄 Production Ready
- All core functionality implemented and tested
- Error handling and validation in place
- Progress tracking and user feedback
- Scalable architecture with microservices
- Comprehensive API documentation
- CI/CD pipeline configured

## Missing Information

### Critical Missing Components

#### 1. Detailed API Specifications
- **OpenAPI/Swagger Documentation**: Complete API specification with all endpoints
- **Authentication Flow**: Detailed JWT implementation, refresh token strategy
- **Error Handling**: Standardized error response formats and codes
- **Rate Limiting**: Specific limits per endpoint and user tier
- **WebSocket Protocol**: Message formats, event types, connection management

#### 2. Security Implementation Details
- **Encryption Strategy**: Data at rest and in transit encryption methods
- **Compliance Documentation**: GDPR, CCPA, COPPA compliance procedures
- **Audit Logging**: Security event logging and monitoring procedures
- **Penetration Testing**: Security testing methodology and schedule
- **Data Privacy**: User data handling and deletion procedures

#### 3. Machine Learning Model Details
- **Model Performance Metrics**: Accuracy, precision, recall for each model
- **Model Versioning**: Strategy for model updates and rollbacks
- **Training Data**: Sources, preprocessing, bias mitigation
- **Inference Optimization**: Model quantization, latency optimization
- **Fallback Strategies**: Rule-based alternatives when models fail

#### 4. Mobile App Specifics
- **Platform Differences**: iOS vs Android specific implementations
- **App Store Guidelines**: Compliance with Apple and Google store policies
- **Push Notifications**: Implementation strategy and user preferences
- **Offline Functionality**: Detailed offline capabilities and sync strategy
- **Device Compatibility**: Minimum device requirements and performance optimization

#### 5. Testing Strategy
- **Test Coverage Requirements**: Minimum coverage percentages for different code types
- **Performance Testing**: Load testing scenarios and benchmarks
- **User Acceptance Testing**: Beta testing program and feedback collection
- **Automated Testing**: CI/CD integration and test automation strategy
- **Accessibility Testing**: WCAG compliance and screen reader support

#### 6. Operational Procedures
- **Incident Response**: Runbooks for common system failures
- **Backup and Recovery**: RTO/RPO targets and recovery procedures
- **Scaling Procedures**: Manual scaling triggers and automation
- **Monitoring Alerts**: Specific alert thresholds and escalation procedures
- **Capacity Planning**: Resource forecasting and scaling triggers

#### 7. Legal and Compliance
- **Terms of Service**: Complete legal documentation
- **Privacy Policy**: Detailed data handling disclosure
- **Music Licensing**: YouTube API compliance and content rights
- **Intellectual Property**: Code licensing and third-party dependencies
- **International Compliance**: Multi-region legal requirements

#### 8. Business Operations
- **Customer Support**: Support channels, response times, escalation procedures
- **Billing System**: Subscription management, payment processing, refunds
- **Analytics Implementation**: User tracking, privacy-compliant analytics
- **A/B Testing**: Feature rollout strategy and experimentation framework
- **Partnership Agreements**: Legal templates for business partnerships

### Technical Gaps

#### 1. Performance Optimization
- **Caching Strategy**: Multi-level caching implementation details
- **Database Optimization**: Query optimization, indexing strategy
- **CDN Configuration**: Asset delivery and geographic distribution
- **Image/Video Optimization**: Compression strategies and formats
- **Memory Management**: Mobile app memory optimization techniques

#### 2. Scalability Architecture
- **Load Balancing**: Algorithm selection and health check configuration
- **Database Sharding**: Partitioning strategy and data distribution
- **Microservice Communication**: Service mesh, circuit breakers, retries
- **Event Streaming**: Message queue configuration and consumer patterns
- **Resource Scaling**: Auto-scaling triggers and resource allocation

#### 3. Development Workflow
- **Code Review Process**: Pull request templates and review criteria
- **Branching Strategy**: Git workflow and release management
- **Documentation Standards**: API docs, code comments, user guides
- **Dependency Management**: Package updates and vulnerability scanning
- **Local Development**: Docker compose, environment setup

#### 4. Quality Assurance
- **Code Quality Tools**: Static analysis, security scanning, complexity metrics
- **Performance Monitoring**: APM integration and custom metrics
- **User Experience Testing**: Usability testing methodology
- **Cross-browser/Platform Testing**: Compatibility matrix and testing tools
- **Regression Testing**: Automated regression test suite

### Strategic Missing Elements

#### 1. Competitive Analysis
- **Market Research**: Detailed competitor analysis and positioning
- **Feature Gap Analysis**: Missing features compared to competitors
- **Pricing Strategy**: Market-based pricing and value proposition
- **Differentiation Strategy**: Unique selling propositions and competitive advantages
- **Market Size**: TAM, SAM, SOM calculations and growth projections

#### 2. Product Roadmap
- **Release Timeline**: Detailed feature release schedule
- **Milestone Definitions**: Success criteria for each development phase
- **Resource Planning**: Team size, skills required, hiring timeline
- **Risk Assessment**: Technical, market, and execution risks
- **Success Metrics**: KPIs for each product stage

#### 3. Financial Planning
- **Cost Structure**: Detailed breakdown of operational costs
- **Revenue Projections**: 3-5 year financial forecast
- **Funding Requirements**: Capital needs and investment strategy
- **Unit Economics**: Customer acquisition cost, lifetime value
- **Break-even Analysis**: Path to profitability and key milestones

#### 4. Team Structure
- **Organizational Chart**: Team roles and reporting structure
- **Hiring Plan**: Timeline and requirements for key positions
- **Skill Requirements**: Technical and non-technical skill needs
- **Remote Work Policy**: Distributed team management and communication
- **Culture Definition**: Company values and team dynamics

### Immediate Action Items

#### High Priority (This Week)
1. **Create OpenAPI Specification**: Document all API endpoints with request/response schemas
2. **Define Error Handling Strategy**: Standardize error codes and response formats
3. **Set Up Development Environment**: Docker compose for local development
4. **Create Testing Framework**: Unit, integration, and E2E test setup
5. **Implement Basic CI/CD**: GitHub Actions workflow for automated testing and deployment

#### Medium Priority (Next 2 Weeks)
1. **Security Audit**: Implement authentication, authorization, and data protection
2. **Performance Baseline**: Establish performance metrics and monitoring
3. **Database Optimization**: Implement proper indexing and query optimization
4. **Mobile App Architecture**: Define component structure and state management
5. **ML Model Integration**: Set up cloud-based model inference pipeline

#### Low Priority (Next Month)
1. **Advanced Features**: Implement social features and gamification
2. **Business Intelligence**: Set up analytics and reporting dashboard
3. **Customer Support**: Implement help desk and knowledge base
4. **Marketing Materials**: Create app store assets and promotional content
5. **Partnership Development**: Reach out to potential business partners

This knowledge base provides a comprehensive foundation for the ZEZE project. The missing information sections highlight areas that need additional research, documentation, and implementation as the project progresses.