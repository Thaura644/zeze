import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import TablatureView from './TablatureView';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  duration: number;
  tempo?: number;
  key?: string;
  tablature?: any;
  chords?: any[];
  sections?: any[];
}

interface UnifiedAudioPlayerProps {
  track: AudioTrack;
  showTablature?: boolean;
  showChords?: boolean;
  showSections?: boolean;
  onClose?: () => void;
  onTrackChange?: (track: AudioTrack) => void;
  playlist?: AudioTrack[];
  enableRecording?: boolean;
  enablePracticeMode?: boolean;
}

const UnifiedAudioPlayer: React.FC<UnifiedAudioPlayerProps> = ({
  track,
  showTablature = true,
  showChords = true,
  showSections = true,
  onClose,
  onTrackChange,
  playlist = [],
  enableRecording = true,
  enablePracticeMode = true,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);
  const [activeSection, setActiveSection] = useState(0);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);

  const playbackLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [track]);

  useEffect(() => {
    // Update playback line animation
    Animated.timing(playbackLineAnim, {
      toValue: currentBeat * 80,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // Calculate current beat
    if (track.tempo && position) {
      const beatPosition = (position / 1000 * track.tempo / 60) % 4;
      setCurrentBeat(Math.floor(beatPosition));
    }

    // Update current chord based on position
    if (track.chords && track.chords.length > 0) {
      const currentChord = track.chords.findIndex(chord => chord.startTime <= position && chord.startTime + chord.duration > position);
      if (currentChord !== -1 && currentChord !== currentChordIndex) {
        setCurrentChordIndex(currentChord);
      }
    }

    // Update active section
    if (track.sections && track.sections.length > 0) {
      const currentSectionIndex = track.sections.findIndex(section => section.startTime <= position && section.startTime + section.duration > position);
      if (currentSectionIndex !== -1 && currentSectionIndex !== activeSection) {
        setActiveSection(currentSectionIndex);
      }
    }
  }, [position, track.tempo, track.chords, track.sections]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      
      if (sound) {
        await sound.unloadAsync();
      }
      
      console.log('Loading audio from:', track.audioUrl);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        {
          shouldPlay: false,
          isLooping: false,
          volume: volume,
        }
      );
      
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying || false);
      
      // Handle looping
      if (isLooping && loopEnd > 0 && status.positionMillis >= loopEnd) {
        sound?.setPositionAsync(loopStart);
      }
    }
  }, [sound, isLooping, loopStart, loopEnd]);

  const togglePlayback = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const stopPlayback = async () => {
    if (!sound) return;

    try {
      await sound.stopAsync();
      setPosition(0);
      setCurrentBeat(0);
      playbackLineAnim.setValue(0);
      setCurrentChordIndex(0);
      setActiveSection(0);
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  const seekToPosition = async (value: number) => {
    if (!sound || !duration) return;

    const newPosition = (value / 100) * duration;
    try {
      await sound.setPositionAsync(newPosition);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const updatePlaybackSpeed = async (speed: number) => {
    setPlaybackSpeed(speed);
    
    if (sound) {
      try {
        await sound.setRateAsync(speed, true);
      } catch (error) {
        console.error('Error setting playback speed:', error);
      }
    }
  };

  const updateVolume = async (vol: number) => {
    setVolume(vol);
    
    if (sound) {
      try {
        await sound.setVolumeAsync(vol);
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
  };

  const toggleMute = async () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    if (sound) {
      try {
        await sound.setIsMutedAsync(newMuteState);
      } catch (error) {
        console.error('Error toggling mute:', error);
      }
    }
  };

  const jumpToSection = async (section: any) => {
    if (!sound) return;
    
    try {
      await sound.setPositionAsync(section.startTime * 1000);
      setActiveSection(track.sections?.indexOf(section) || 0);
    } catch (error) {
      console.error('Error jumping to section:', error);
    }
  };

  const jumpToChord = async (chordIndex: number) => {
    if (!sound || !track.chords) return;
    
    try {
      const chord = track.chords[chordIndex];
      if (chord) {
        await sound.setPositionAsync(chord.startTime * 1000);
        setCurrentChordIndex(chordIndex);
      }
    } catch (error) {
      console.error('Error jumping to chord:', error);
    }
  };

  const setLoopRange = () => {
    if (track.chords && track.chords[currentChordIndex]) {
      const currentChord = track.chords[currentChordIndex];
      setLoopStart(currentChord.startTime * 1000);
      setLoopEnd((currentChord.startTime + currentChord.duration) * 1000);
      setIsLooping(true);
    }
  };

  const clearLoop = () => {
    setIsLooping(false);
    setLoopStart(0);
    setLoopEnd(0);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimeDecimal = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const renderSpeedControls = () => (
    <View style={styles.speedControl}>
      <Text style={styles.sectionTitle}>Playback Speed</Text>
      
      {/* Preset speed buttons */}
      <View style={styles.speedButtons}>
        {[0.5, 0.75, 1.0, 1.25, 1.5].map((speed) => (
          <TouchableOpacity
            key={speed}
            style={[
              styles.speedButton,
              playbackSpeed === speed && styles.activeSpeedButton,
            ]}
            onPress={() => updatePlaybackSpeed(speed)}
          >
            <Text
              style={[
                styles.speedButtonText,
                playbackSpeed === speed && styles.activeSpeedButtonText,
              ]}
            >
              {speed}x
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Custom speed slider */}
      <View style={styles.customSpeedContainer}>
        <Text style={styles.customSpeedLabel}>
          Custom: {playbackSpeed.toFixed(2)}x
        </Text>
        <Slider
          style={styles.customSpeedSlider}
          minimumValue={0.25}
          maximumValue={2.0}
          value={playbackSpeed}
          onValueChange={updatePlaybackSpeed}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.surfaceLight}
          thumbTintColor={COLORS.primary}
          step={0.05}
        />
      </View>
    </View>
  );

  const renderBeatIndicator = () => (
    <View style={styles.beatIndicator}>
      <Text style={styles.beatLabel}>Beat</Text>
      {[0, 1, 2, 3].map((beat) => (
        <View
          key={beat}
          style={[
            styles.beatDot,
            beat === currentBeat && styles.activeBeat,
            beat < currentBeat && styles.passedBeat,
          ]}
        />
      ))}
    </View>
  );

  const renderAudioControls = () => (
    <View style={styles.audioControls}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.progressBar}
          minimumValue={0}
          maximumValue={100}
          value={duration ? (position / duration) * 100 : 0}
          onSlidingComplete={seekToPosition}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.surfaceLight}
          thumbTintColor={COLORS.primary}
        />
        <View style={styles.timeLabels}>
          <Text style={styles.timeLabel}>{formatTime(position)}</Text>
          <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Transport Controls */}
      <View style={styles.transportButtons}>
        <TouchableOpacity
          style={[styles.controlButton, styles.stopButton]}
          onPress={stopPlayback}
          disabled={isLoading}
        >
          <Ionicons name="stop" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.playButton, isLoading && styles.disabledButton]}
          onPress={togglePlayback}
          disabled={isLoading}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={32} 
            color={COLORS.text} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.reloadButton]}
          onPress={loadAudio}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isLooping && styles.loopButtonActive]}
          onPress={isLooping ? clearLoop : setLoopRange}
        >
          <Ionicons name="repeat" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.muteButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons name={isMuted ? "volume-off" : "volume-high"} size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Volume Control */}
      <View style={styles.volumeControl}>
        <Ionicons name="volume-low" size={16} color={COLORS.textSecondary} />
        <Slider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={updateVolume}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.surfaceLight}
          thumbTintColor={COLORS.primary}
        />
        <Ionicons name="volume-high" size={16} color={COLORS.textSecondary} />
        <Text style={styles.volumeLabel}>{Math.round(volume * 100)}%</Text>
      </View>
    </View>
  );

  const renderSections = () => {
    if (!showSections || !track.sections || track.sections.length === 0) return null;

    return (
      <View style={styles.sectionsContainer}>
        <Text style={styles.sectionTitle}>Song Sections</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.sectionButtons}>
            {track.sections.map((section, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.sectionButton,
                  activeSection === index && styles.activeSectionButton,
                ]}
                onPress={() => jumpToSection(section)}
              >
                <Text style={styles.sectionButtonText}>{section.name}</Text>
                <Text style={styles.sectionTime}>
                  {formatTimeDecimal(section.startTime)} - {formatTimeDecimal(section.startTime + section.duration)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderChords = () => {
    if (!showChords || !track.chords || track.chords.length === 0) return null;

    const currentChord = track.chords[currentChordIndex];

    return (
      <View style={styles.chordsContainer}>
        <Text style={styles.sectionTitle}>Chord Progression</Text>
        
        {/* Current Chord Display */}
        {currentChord && (
          <View style={styles.currentChord}>
            <Text style={styles.currentChordName}>{currentChord.name}</Text>
            <Text style={styles.currentChordFingering}>
              {currentChord.fingering || 'Standard fingering'}
            </Text>
          </View>
        )}

        {/* Chord Timeline */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chordTimeline}>
            {track.chords.map((chord, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.chordItem,
                  index === currentChordIndex && styles.activeChord,
                  index < currentChordIndex && styles.passedChord,
                ]}
                onPress={() => jumpToChord(index)}
              >
                <Text style={styles.chordName}>{chord.name}</Text>
                <Text style={styles.chordTime}>
                  {formatTimeDecimal(chord.startTime)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderRecordingControls = () => {
    if (!enableRecording) return null;

    return (
      <View style={styles.recordingContainer}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
          ]}
          onPress={() => setIsRecording(!isRecording)}
        >
          <Ionicons 
            name={isRecording ? "radio-button-on" : "radio-button-off"} 
            size={24} 
            color={COLORS.text} 
          />
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Recording...' : 'Record'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        )}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle}>{track.title}</Text>
          {track.artist && (
            <Text style={styles.trackArtist}>{track.artist}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {track.tempo && (
            <Text style={styles.tempoInfo}>{track.tempo} BPM</Text>
          )}
          {track.key && (
            <Text style={styles.keyInfo}>Key: {track.key}</Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Beat Indicator */}
        {renderBeatIndicator()}

        {/* Audio Controls */}
        {renderAudioControls()}

        {/* Speed Controls */}
        {renderSpeedControls()}

        {/* Tablature */}
        {showTablature && track.tablature && (
          <View style={styles.tablatureSection}>
            <Text style={styles.sectionTitle}>Tablature</Text>
            <TablatureView tablature={track.tablature} currentBeat={currentBeat} />
          </View>
        )}

        {/* Sections */}
        {renderSections()}

        {/* Chords */}
        {renderChords()}

        {/* Recording Controls */}
        {renderRecordingControls()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  trackInfo: {
    flex: 1,
    alignItems: 'center',
  },
  trackTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  trackArtist: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  tempoInfo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  keyInfo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.secondary,
    backgroundColor: COLORS.secondaryLight + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  beatIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  beatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    fontSize: 12,
  },
  beatDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  activeBeat: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.3 }],
    ...SHADOWS.soft,
  },
  passedBeat: {
    backgroundColor: COLORS.surfaceDark,
  },
  audioControls: {
    marginBottom: SPACING.lg,
  },
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  timeLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  transportButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.xl,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  disabledButton: {
    backgroundColor: COLORS.surfaceLight,
    opacity: 0.6,
  },
  playButton: {
    backgroundColor: COLORS.primary,
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.round,
    ...SHADOWS.medium,
  },
  stopButton: {
    backgroundColor: COLORS.surfaceDark,
  },
  reloadButton: {
    backgroundColor: COLORS.surfaceDark,
  },
  loopButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  muteButtonActive: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.warning,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  volumeSlider: {
    flex: 1,
    height: 30,
  },
  volumeLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    width: 40,
    textAlign: 'right',
  },
  speedControl: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  speedButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  activeSpeedButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  speedButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeSpeedButtonText: {
    color: COLORS.text,
  },
  customSpeedContainer: {
    alignItems: 'center',
  },
  customSpeedLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  customSpeedSlider: {
    width: '100%',
    height: 30,
  },
  tablatureSection: {
    marginBottom: SPACING.lg,
  },
  sectionsContainer: {
    marginBottom: SPACING.lg,
  },
  sectionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sectionButton: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    minWidth: 100,
  },
  activeSectionButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sectionButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  sectionTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  chordsContainer: {
    marginBottom: SPACING.lg,
  },
  currentChord: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  currentChordName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  currentChordFingering: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  chordTimeline: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chordItem: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    minWidth: 60,
    alignItems: 'center',
  },
  activeChord: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  passedChord: {
    backgroundColor: COLORS.surfaceDark,
    borderColor: COLORS.surfaceDark,
  },
  chordName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  chordTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.surfaceDark,
    gap: SPACING.sm,
  },
  recordButtonActive: {
    backgroundColor: '#FF4B2B',
    borderColor: '#FF4B2B',
  },
  recordButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
});

export default UnifiedAudioPlayer;