import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { play, pause, setCurrentTime, nextChord, previousChord, setDuration } from '@/store/slices/playerSlice';
import { RootState, AppDispatch } from '@/store';
import { Song } from '@/types/music';
import InteractiveFretboard from '@/components/Fretboard/InteractiveFretboard';
import ChordDisplay from '@/components/Player/ChordDisplay';
import Tuner from '@/components/Player/Tuner';
import useAudioSync from '@/hooks/useAudioSync';
import usePracticeSession from '@/hooks/usePracticeSession';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { LEARNING_ROAMMAP } from '@/data/learningRoadmap';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PlayerProps {
  song: Song;
  onBack?: () => void;
}

const Player: React.FC<PlayerProps> = ({ song, onBack }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const videoRef = useRef<Video>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [transpositionKey, setTranspositionKey] = useState(song.key);
  const [capoPosition, setCapoPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [tempoPercentage, setTempoPercentage] = useState(100);
  const [loopSection, setLoopSection] = useState<{ start: number; end: number } | null>(null);
  const [showTechniqueHelp, setShowTechniqueHelp] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [activeStem, setActiveStem] = useState<'both' | 'vocals' | 'instrumental'>('both');
  const [isSeparating, setIsSeparating] = useState(false);
  const [separatedTracks, setSeparatedTracks] = useState<{ vocals?: string; instrumental?: string } | null>(null);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [showTuner, setShowTuner] = useState(false);

  const {
    isPlaying,
    currentTime,
    currentChordIndex,
    loading,
  } = useSelector((state: RootState) => state.player);

  const practiceSession = usePracticeSession();

  // Sync audio with chord display
  useAudioSync({
    currentTime,
    chords: song.chords,
    onChordChange: (index) => {
      // Chord change is handled by player slice
    },
  });

  const currentChord = currentChordIndex >= 0 ? song.chords[currentChordIndex] : null;

  // Helper functions for skills
  const getRequiredSkills = (song: Song): string[] => {
    // Based on song difficulty and characteristics, determine required skills
    const skills: string[] = [];

    if (song.difficulty <= 3) {
      skills.push('open-chords', 'strumming-patterns');
    } else if (song.difficulty <= 6) {
      skills.push('barre-chords', 'fingerpicking', 'chord-progressions');
    } else {
      skills.push('arpeggios', 'sweeping', 'major-scale-modes');
    }

    // Add rhythm and timing skills
    skills.push('strumming-patterns');

    // Add theory skills
    skills.push('key-signatures');

    return skills;
  };

  const findSkillById = (skillId: string) => {
    return LEARNING_ROAMMAP.flatMap(cat => cat.skills).find(s => s.id === skillId);
  };

  // Auto-hide controls timer
  useEffect(() => {
    if (isPlaying && showControls) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, showControls, currentTime]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      dispatch(pause());
    } else {
      // Start practice session if not active
      if (!practiceSession.sessionActive && currentChordIndex >= 0) {
        practiceSession.startSession(song.id, {
          focus_techniques: ['chord_changes', 'rhythm'],
          tempo_percentage: tempoPercentage,
        });
      }
      dispatch(play());
    }
  }, [isPlaying, dispatch, practiceSession, song.id, currentChordIndex, tempoPercentage]);

  const handleSeek = useCallback((time: number) => {
    dispatch(setCurrentTime(time));
    if (videoRef.current) {
      videoRef.current.setPositionAsync(time * 1000); // expo-av uses ms
    }
  }, [dispatch]);

  const handleNextChord = useCallback(() => {
    if (currentChord && currentChordIndex < song.chords.length - 1) {
      const nextChordTime = song.chords[currentChordIndex + 1].startTime;
      handleSeek(nextChordTime);
      dispatch(nextChord());
    }
  }, [currentChord, currentChordIndex, song.chords, handleSeek, dispatch]);

  const handlePreviousChord = useCallback(() => {
    if (currentChordIndex > 0) {
      const prevChordTime = song.chords[currentChordIndex - 1].startTime;
      handleSeek(prevChordTime);
      dispatch(previousChord());
    }
  }, [currentChordIndex, song.chords, handleSeek, dispatch]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Playback error:', status.error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load video',
        });
      }
      return;
    }

    const timeInSeconds = status.positionMillis / 1000;
    dispatch(setCurrentTime(timeInSeconds));

    if (status.didJustFinish) {
      dispatch(pause());
      if (practiceSession.sessionActive) {
        practiceSession.endSession();
      }
      Toast.show({
        type: 'success',
        text1: 'Song Complete',
        text2: 'Great job! You finished the song.',
      });
    }

    if (status.durationMillis && status.durationMillis > 0) {
      dispatch(setDuration(status.durationMillis / 1000));
    }
  }, [dispatch, practiceSession]);

  const toggleLoop = useCallback(() => {
    if (currentChord && !loopSection) {
      setLoopSection({
        start: currentChord.startTime,
        end: currentChord.startTime + currentChord.duration,
      });
    } else {
      setLoopSection(null);
    }
  }, [currentChord, loopSection]);

  const adjustTempo = useCallback((percentage: number) => {
    setTempoPercentage(percentage);
    setPlaybackSpeed(percentage / 100);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
        Toast.show({
          type: 'info',
          text1: 'Recording Started',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Microphone permission is required to record',
        });
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      Toast.show({
        type: 'success',
        text1: 'Recording Saved',
        text2: `Saved to ${uri?.split('/').pop()}`,
      });
      // Future: Offer to upload/analyze
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading song...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        {song.videoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: song.videoUrl }}
            style={styles.video}
            useNativeControls={false}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            rate={playbackSpeed}
            shouldPlay={isPlaying}
            isMuted={isMuted}
            volume={1.0}
          />
        ) : (
          <View style={styles.noVideoContainer}>
            <Text style={styles.noVideoText}>🎵</Text>
            <Text style={styles.noVideoSubtext}>Audio Only Mode</Text>
          </View>
        )}

        {/* Overlay Controls */}
        {showControls && (
          <TouchableOpacity
            style={styles.videoOverlay}
            activeOpacity={1}
            onPress={() => setShowControls(false)}
          >
            <View style={styles.topControls}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            <View style={styles.songInfo}>
              <Text style={styles.songTitle}>{song.title}</Text>
              <Text style={styles.songArtist}>{song.artist}</Text>
            </View>
            <TouchableOpacity
              style={styles.skillsButton}
              onPress={() => setShowSkillsDropdown(!showSkillsDropdown)}
            >
              <Text style={styles.skillsButtonText}>🎓</Text>
            </TouchableOpacity>
          </View>

          {showSkillsDropdown && (
            <View style={styles.skillsDropdown}>
              <Text style={styles.skillsTitle}>Skills Required for this Song:</Text>
              {getRequiredSkills(song).map((skillId) => {
                const skill = findSkillById(skillId);
                return skill ? (
                  <TouchableOpacity
                    key={skill.id}
                    style={styles.skillItem}
                    onPress={() => {
                      setShowSkillsDropdown(false);
                      // Navigate to learning view
                      (navigation as any)?.navigate('Learning', { skillId: skill.id });
                    }}
                  >
                    <Text style={styles.skillItemText}>{skill.name}</Text>
                    <Text style={styles.skillDifficulty}>{skill.difficulty}</Text>
                  </TouchableOpacity>
                ) : null;
              })}
            </View>
          )}
          </TouchableOpacity>
        )}
      </View>

      {/* Suppression Toggles */}
      <View style={styles.suppressionBar}>
        <TouchableOpacity
          style={[styles.suppressionButton, activeStem === 'both' && styles.suppressionButtonActive]}
          onPress={() => setActiveStem('both')}
        >
          <Text style={styles.suppressionText}>Full Audio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.suppressionButton, activeStem === 'vocals' && styles.suppressionButtonActive]}
          onPress={() => setActiveStem('vocals')}
        >
          <Text style={styles.suppressionText}>Vocals Only</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.suppressionButton, activeStem === 'instrumental' && styles.suppressionButtonActive]}
          onPress={() => setActiveStem('instrumental')}
        >
          <Text style={styles.suppressionText}>No Vocals</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Chord Display */}
        <View style={styles.chordSection}>
          <ChordDisplay
            chord={currentChord}
            isHighlighted={true}
          />
          {currentChord && (
            <Text style={styles.chordName}>{currentChord.name}</Text>
          )}
        </View>

        {/* Interactive Fretboard */}
        <View style={styles.fretboardSection}>
          <InteractiveFretboard
            chords={song.chords}
            currentChordIndex={currentChordIndex}
            isInteractive={true}
            showFretNumbers={true}
            showTuningNotes={true}
            transposeKey={transpositionKey}
            capoPosition={capoPosition}
            onChordChange={(index) => {
              const chordTime = song.chords[index].startTime;
              handleSeek(chordTime);
            }}
          />
        </View>

        {/* Playback Controls */}
        <View style={styles.playbackControls}>
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentTime / song.duration) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.timeText}>{formatTime(song.duration)}</Text>
          </View>

          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handlePreviousChord}
              disabled={currentChordIndex <= 0}
            >
              <Text style={styles.controlButtonText}>⏮</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.playButtonActive]}
              onPress={handlePlayPause}
            >
              <Text style={styles.playButtonText}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleNextChord}
              disabled={currentChordIndex >= song.chords.length - 1}
            >
              <Text style={styles.controlButtonText}>⏭</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallControlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              <Text style={styles.controlButtonText}>{isMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallControlButton, isRecording && styles.recordingButtonActive]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.controlButtonText}>{isRecording ? '⏹' : '🎙️'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallControlButton, showTuner && styles.controlButtonActive]}
              onPress={() => setShowTuner(true)}
            >
              <Text style={styles.controlButtonText}>🎸</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tuner Overlay */}
        <Tuner
          isVisible={showTuner}
          onClose={() => setShowTuner(false)}
        />

        {/* Learning Controls */}
        <View style={styles.learningControls}>
          <Text style={styles.learningSectionTitle}>Learning Options</Text>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Tempo: {tempoPercentage}%</Text>
            <View style={styles.tempoButtons}>
              {[75, 85, 100, 115].map((tempo) => (
                <TouchableOpacity
                  key={tempo}
                  style={[
                    styles.tempoButton,
                    tempoPercentage === tempo && styles.tempoButtonActive,
                  ]}
                  onPress={() => adjustTempo(tempo)}
                >
                  <Text style={styles.tempoButtonText}>{tempo}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Loop Current Chord</Text>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                loopSection && styles.toggleButtonActive,
              ]}
              onPress={toggleLoop}
            >
              <Text style={styles.toggleButtonText}>
                {loopSection ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Technique Help</Text>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                showTechniqueHelp && styles.toggleButtonActive,
              ]}
              onPress={() => setShowTechniqueHelp(!showTechniqueHelp)}
            >
              <Text style={styles.toggleButtonText}>
                {showTechniqueHelp ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Technique Help */}
        {showTechniqueHelp && currentChord && (
          <View style={styles.techniqueHelp}>
            <Text style={styles.learningSectionTitle}>Technique Tips</Text>
            <Text style={styles.techniqueText}>
              {currentChord.name} chord: Place your fingers on the fretboard as shown.
              Strum from the lowest string towards the highest.
              Make sure each note rings clearly without buzzing.
            </Text>
          </View>
        )}

        {/* Practice Session Info */}
        {practiceSession.sessionActive && (
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>Practice Session Active</Text>
            <Text style={styles.sessionText}>
              Started: {new Date(practiceSession.startTime || '').toLocaleTimeString()}
            </Text>
            <TouchableOpacity
              style={styles.endSessionButton}
              onPress={() => practiceSession.endSession()}
            >
              <Text style={styles.endSessionButtonText}>End Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.text,
    marginTop: SPACING.md,
    ...TYPOGRAPHY.body,
  },
  videoContainer: {
    position: 'relative',
    height: screenHeight * 0.3,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  backButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.h3,
    fontSize: 18,
  },
  songArtist: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  noVideoText: {
    fontSize: 48,
    marginBottom: SPACING.xs,
  },
  noVideoSubtext: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.body,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  chordSection: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  chordName: {
    color: COLORS.primary,
    ...TYPOGRAPHY.h2,
    marginTop: SPACING.md,
  },
  fretboardSection: {
    marginVertical: SPACING.lg,
  },
  playbackControls: {
    marginVertical: SPACING.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  timeText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    width: 40,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    marginHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  controlButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  playButton: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    ...SHADOWS.soft,
  },
  playButtonActive: {
    backgroundColor: COLORS.primaryDark,
  },
  controlButtonText: {
    color: COLORS.text,
    fontSize: 18,
  },
  playButtonText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  suppressionBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.xs,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: -SPACING.md,
    zIndex: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.soft,
  },
  suppressionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  suppressionButtonActive: {
    backgroundColor: COLORS.primary,
  },
  suppressionText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  smallControlButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  recordingButtonActive: {
    backgroundColor: '#FF4B2B',
    borderColor: '#FF4B2B',
  },
  learningControls: {
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  learningSectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  controlLabel: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.body,
    flex: 1,
  },
  tempoButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  tempoButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  tempoButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tempoButtonText: {
    color: COLORS.text,
    fontSize: 12,
  },
  toggleButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    color: COLORS.text,
    fontSize: 12,
  },
  techniqueHelp: {
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  techniqueText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 22,
  },
  sessionInfo: {
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  sessionTitle: {
    color: COLORS.secondary,
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    marginBottom: SPACING.xs,
  },
  sessionText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.md,
  },
  endSessionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  endSessionButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
    fontSize: 14,
  },
  skillsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  skillsButtonText: {
    fontSize: 20,
  },
  skillsDropdown: {
    position: 'absolute',
    top: 80,
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    minWidth: 250,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.soft,
  },
  skillsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontSize: 16,
  },
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surfaceLight,
  },
  skillItemText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    fontSize: 14,
  },
  skillDifficulty: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
    fontSize: 12,
  },
});

export default Player;