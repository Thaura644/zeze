import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import TablatureView from '../Player/TablatureView';

const { width } = Dimensions.get('window');

interface Exercise {
  id: string;
  type: 'melody' | 'chord' | 'scale' | 'riff';
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  style: 'rock' | 'blues' | 'jazz' | 'folk' | 'classical';
  tempo: number;
  duration: number;
  key: string;
  audioUrl: string;
  tablature: any;
  instructions: any;
  variations?: any[];
  generatedAt: string;
  fallback?: boolean;
}

interface ExercisePlayerProps {
  exercise: Exercise;
  onClose: () => void;
  onVariationSelect?: (variation: any) => void;
}

const ExercisePlayer: React.FC<ExercisePlayerProps> = ({
  exercise,
  onClose,
  onVariationSelect,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [currentBeat, setCurrentBeat] = useState(0);
  
  const slideAnim = useRef(new Animated.Value(width)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 65,
      friction: 8,
    }).start();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (exercise) {
      loadAudio();
    }
  }, [exercise]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      
      // Unload existing sound
      if (sound) {
        await sound.unloadAsync();
      }
      
      console.log('Loading audio from:', exercise.audioUrl);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: exercise.audioUrl },
        {
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
        }
      );
      
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to load audio file');
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying || false);
      
      // Update progress animation
      if (status.durationMillis && status.positionMillis) {
        const progress = status.positionMillis / status.durationMillis;
        progressAnim.setValue(progress);
      }
      
      // Calculate current beat for visual feedback
      if (status.durationMillis && status.positionMillis) {
        const beatPosition = (status.positionMillis / 1000 * exercise.tempo / 60) % 4;
        setCurrentBeat(Math.floor(beatPosition));
      }
    }
  };

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
      progressAnim.setValue(0);
      setCurrentBeat(0);
    } catch (error) {
      console.error('Error stopping playback:', error);
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

  const seekToPosition = async (value: number) => {
    if (!sound || !duration) return;

    const position = (value / 100) * duration;
    try {
      await sound.setPositionAsync(position);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleVariationSelect = async (variation: any) => {
    try {
      setIsLoading(true);
      if (onVariationSelect) {
        await onVariationSelect(variation);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading variation:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to load variation');
    }
  };

  const renderBeatIndicator = () => {
    const beats = [0, 1, 2, 3];
    return (
      <View style={styles.beatIndicator}>
        {beats.map((beat) => (
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
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise Player</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Exercise Info */}
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseTitle}>
            {exercise.style} {exercise.type} - {exercise.key}
          </Text>
          <Text style={styles.exerciseSubtitle}>
            {exercise.skillLevel} • {exercise.tempo} BPM • {exercise.duration}s
          </Text>
          {exercise.fallback && (
            <Text style={styles.fallbackNote}>
              Generated with basic synthesis
            </Text>
          )}
        </View>

        {/* Beat Indicator */}
        {renderBeatIndicator()}

        {/* Audio Controls */}
        <View style={styles.audioControls}>
          <View style={styles.transportButtons}>
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopPlayback}
            >
              <Ionicons name="stop" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.playButton, isLoading && styles.disabledButton]}
              onPress={togglePlayback}
              disabled={isLoading}
            >
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={32} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.reloadButton]}
              onPress={loadAudio}
              disabled={isLoading}
            >
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Slider
              style={styles.progressBar}
              minimumValue={0}
              maximumValue={100}
              value={duration ? (position / duration) * 100 : 0}
              onSlidingComplete={seekToPosition}
              minimumTrackTintColor="#FF6B6B"
              maximumTrackTintColor="#333"
              thumbTintColor="#FF6B6B"
            />
            <View style={styles.timeLabels}>
              <Text style={styles.timeLabel}>{formatTime(position)}</Text>
              <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>

        {/* Speed Control */}
        <View style={styles.speedControl}>
          <Text style={styles.speedLabel}>Playback Speed</Text>
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
          <View style={styles.customSpeedContainer}>
            <Slider
              style={styles.customSpeedSlider}
              minimumValue={0.25}
              maximumValue={2.0}
              value={playbackSpeed}
              onValueChange={updatePlaybackSpeed}
              minimumTrackTintColor="#FF6B6B"
              maximumTrackTintColor="#333"
              thumbTintColor="#FF6B6B"
              step={0.05}
            />
            <Text style={styles.customSpeedLabel}>
              {playbackSpeed.toFixed(2)}x
            </Text>
          </View>
        </View>

        {/* Tablature */}
        <View style={styles.tablatureSection}>
          <Text style={styles.sectionTitle}>Tablature</Text>
          <TablatureView tablature={exercise.tablature} currentBeat={currentBeat} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowInstructions(!showInstructions)}
          >
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Ionicons
              name={showInstructions ? "chevron-up" : "chevron-down"}
              size={20}
              color="#FF6B6B"
            />
          </TouchableOpacity>
          
          {showInstructions && (
            <View style={styles.instructionsContent}>
              <Text style={styles.instructionText}>
                {exercise.instructions?.tempo}
              </Text>
              <Text style={styles.instructionText}>
                {exercise.instructions?.technique}
              </Text>
              <Text style={styles.instructionText}>
                {exercise.instructions?.tips}
              </Text>
            </View>
          )}
        </View>

        {/* Variations */}
        {exercise.variations && exercise.variations.length > 0 && (
          <View style={styles.variationsSection}>
            <Text style={styles.sectionTitle}>Variations</Text>
            {exercise.variations.map((variation) => (
              <TouchableOpacity
                key={variation.id}
                style={styles.variationButton}
                onPress={() => handleVariationSelect(variation)}
              >
                <Text style={styles.variationName}>{variation.name}</Text>
                <Text style={styles.variationDescription}>
                  {variation.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#2a2a2a',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exerciseInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  exerciseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  exerciseSubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackNote: {
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  beatIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 12,
  },
  beatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  activeBeat: {
    backgroundColor: '#FF6B6B',
    transform: [{ scale: 1.2 }],
  },
  passedBeat: {
    backgroundColor: '#666',
  },
  audioControls: {
    marginBottom: 30,
  },
  transportButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#FF6B6B',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  stopButton: {
    backgroundColor: '#666',
  },
  reloadButton: {
    backgroundColor: '#666',
  },
  disabledButton: {
    backgroundColor: '#444',
    opacity: 0.6,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 4,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeLabel: {
    color: '#ccc',
    fontSize: 12,
  },
  speedControl: {
    marginBottom: 30,
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
  },
  speedLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  speedButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeSpeedButton: {
    backgroundColor: '#FF6B6B',
  },
  speedButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeSpeedButtonText: {
    color: '#fff',
  },
  customSpeedContainer: {
    alignItems: 'center',
  },
  customSpeedSlider: {
    width: '100%',
    height: 4,
    marginBottom: 8,
  },
  customSpeedLabel: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tablatureSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  instructionsSection: {
    marginBottom: 30,
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
  },
  instructionsContent: {
    gap: 10,
  },
  instructionText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  variationsSection: {
    marginBottom: 30,
  },
  variationButton: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  variationName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  variationDescription: {
    color: '#ccc',
    fontSize: 14,
  },
});

export default ExercisePlayer;