import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';

const GUITAR_STRINGS = [
  { name: 'E', frequency: 82.41, string: 6 },
  { name: 'A', frequency: 110.00, string: 5 },
  { name: 'D', frequency: 146.83, string: 4 },
  { name: 'G', frequency: 196.00, string: 3 },
  { name: 'B', frequency: 246.94, string: 2 },
  { name: 'E', frequency: 329.63, string: 1 },
];

const { width } = Dimensions.get('window');

interface GuitarTunerProps {
  visible: boolean;
  onClose: () => void;
}

const GuitarTuner: React.FC<GuitarTunerProps> = ({ visible, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [detectedFrequency, setDetectedFrequency] = useState<number | null>(null);
  const [closestString, setClosestString] = useState<typeof GUITAR_STRINGS[0] | null>(null);
  const [cents, setCents] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const needleRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [visible]);

  useEffect(() => {
    if (detectedFrequency) {
      analyzeFrequency(detectedFrequency);
    }
  }, [detectedFrequency]);

  useEffect(() => {
    // Animate needle based on cents offset
    Animated.spring(needleRotation, {
      toValue: cents / 50, // Normalized to -1 to 1 range (50 cents max)
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, [cents]);

  const startListening = async () => {
    try {
      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Audio permission not granted');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsListening(true);

      // Start pitch detection loop
      startPitchDetection();
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  };

  const stopListening = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      setIsListening(false);
      setDetectedFrequency(null);
      setClosestString(null);
      setCents(0);
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  };

  const startPitchDetection = () => {
    // This is a simplified pitch detection simulation
    // In a real implementation, you would use Web Audio API or a native module
    // to perform actual FFT analysis on the audio input

    // For demonstration, we'll simulate pitch detection
    const interval = setInterval(() => {
      if (!isListening) {
        clearInterval(interval);
        return;
      }

      // Simulate pitch detection (in production, use actual audio analysis)
      simulatePitchDetection();
    }, 100);
  };

  const simulatePitchDetection = () => {
    // In production, this would analyze actual audio input
    // For now, we simulate random pitch detection for demonstration
    const randomString = GUITAR_STRINGS[Math.floor(Math.random() * GUITAR_STRINGS.length)];
    const offset = (Math.random() - 0.5) * 20; // Random offset ±10 cents
    const frequency = randomString.frequency * Math.pow(2, offset / 1200);
    setDetectedFrequency(frequency);
  };

  const analyzeFrequency = (frequency: number) => {
    // Find the closest string
    let closest = GUITAR_STRINGS[0];
    let minDiff = Math.abs(frequency - closest.frequency);

    for (const string of GUITAR_STRINGS) {
      const diff = Math.abs(frequency - string.frequency);
      if (diff < minDiff) {
        minDiff = diff;
        closest = string;
      }
    }

    setClosestString(closest);

    // Calculate cents offset
    const centsOffset = 1200 * Math.log2(frequency / closest.frequency);
    setCents(Math.round(centsOffset));
  };

  const getStatusColor = () => {
    if (!closestString) return COLORS.textSecondary;
    if (Math.abs(cents) <= 5) return COLORS.success;
    if (Math.abs(cents) <= 15) return COLORS.warning;
    return COLORS.error;
  };

  const getStatusText = () => {
    if (!closestString) return 'Play a string';
    if (Math.abs(cents) <= 5) return 'In Tune!';
    if (cents > 0) return `${cents} cents sharp`;
    return `${Math.abs(cents)} cents flat`;
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Guitar Tuner</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* String Display */}
      <View style={styles.stringsContainer}>
        {GUITAR_STRINGS.map((string) => (
          <View
            key={string.string}
            style={[
              styles.stringItem,
              closestString?.string === string.string && styles.stringItemActive,
            ]}
          >
            <Text
              style={[
                styles.stringNumber,
                closestString?.string === string.string && styles.stringNumberActive,
              ]}
            >
              {string.string}
            </Text>
            <Text
              style={[
                styles.stringNote,
                closestString?.string === string.string && styles.stringNoteActive,
              ]}
            >
              {string.name}
            </Text>
          </View>
        ))}
      </View>

      {/* Tuner Display */}
      <View style={styles.tunerDisplay}>
        <View style={styles.scaleContainer}>
          {/* Scale markers */}
          {[-50, -25, 0, 25, 50].map((cent) => (
            <View key={cent} style={[styles.scaleMark, cent === 0 && styles.scaleMarkCenter]}>
              <View style={styles.scaleMarkLine} />
              <Text style={styles.scaleMarkText}>{cent === 0 ? '0' : ''}</Text>
            </View>
          ))}
        </View>

        {/* Needle */}
        <Animated.View
          style={[
            styles.needle,
            {
              transform: [
                { rotate: needleRotation.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-45deg', '45deg'],
                }) },
              ],
            },
          ]}
        >
          <View style={[styles.needleLine, { backgroundColor: getStatusColor() }]} />
        </Animated.View>

        {/* Center Display */}
        <View style={styles.centerDisplay}>
          {closestString && (
            <>
              <Text style={styles.detectedNote}>{closestString.name}</Text>
              <Text style={styles.detectedString}>String {closestString.string}</Text>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
              {detectedFrequency && (
                <Text style={styles.frequencyText}>
                  {detectedFrequency.toFixed(2)} Hz
                </Text>
              )}
            </>
          )}
          {!closestString && (
            <Text style={styles.promptText}>Play a string to tune</Text>
          )}
        </View>
      </View>

      {/* Control Button */}
      <TouchableOpacity
        style={[styles.listenButton, isListening && styles.listenButtonActive]}
        onPress={isListening ? stopListening : startListening}
      >
        <Text style={styles.listenButtonText}>
          {isListening ? 'Stop Listening' : 'Start Tuning'}
        </Text>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Tap "Start Tuning" and play each string one at a time.
        </Text>
        <Text style={styles.instructionText}>
          Adjust tuning pegs until the indicator is green and centered.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    zIndex: 1000,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 30,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  stringsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.xl,
  },
  stringItem: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 8,
    minWidth: 50,
  },
  stringItemActive: {
    backgroundColor: COLORS.primary + '20',
  },
  stringNumber: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stringNumberActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  stringNote: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  stringNoteActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tunerDisplay: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - SPACING.lg * 2,
    position: 'absolute',
    top: 40,
  },
  scaleMark: {
    alignItems: 'center',
    width: 2,
  },
  scaleMarkCenter: {
    width: 3,
  },
  scaleMarkLine: {
    width: '100%',
    height: 20,
    backgroundColor: COLORS.textSecondary,
  },
  scaleMarkText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  needle: {
    position: 'absolute',
    top: 30,
    height: 80,
    width: 4,
    alignItems: 'center',
  },
  needleLine: {
    width: 4,
    height: '100%',
    borderRadius: 2,
  },
  centerDisplay: {
    alignItems: 'center',
    marginTop: 120,
  },
  detectedNote: {
    fontSize: 72,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detectedString: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statusText: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.md,
    fontWeight: 'bold',
  },
  frequencyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  promptText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  listenButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  listenButtonActive: {
    backgroundColor: COLORS.error,
  },
  listenButtonText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  instructions: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  instructionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginVertical: SPACING.xs,
  },
});

export default GuitarTuner;
