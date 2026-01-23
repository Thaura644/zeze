import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { PitchDetector } from 'pitchy';
import AudioRecord from 'react-native-audio-record';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface TunerProps {
  isVisible: boolean;
  onClose: () => void;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const Tuner: React.FC<TunerProps> = ({ isVisible, onClose }) => {
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [clarity, setClarity] = useState(0);
  const [cents, setCents] = useState(0);
  const [isTuning, setIsTuning] = useState(false);
  
  const needleAnim = useRef(new Animated.Value(0)).current;
  const recordingRef = useRef<Audio.Recording | null>(null);
  const dataListenerRef = useRef<any>(null);

  useEffect(() => {
    if (isVisible) {
      startTuning();
    } else {
      stopTuning();
    }
    return () => {
      stopTuning().catch(console.error);
    };
  }, [isVisible]);

  const startTuning = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setIsTuning(true);
      
      const options = {
        sampleRate: 44100,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // microphone
        wavFile: '',
      };

      AudioRecord.init(options);

      const handleData = (data: string) => {
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;
        const int16Array = new Int16Array(arrayBuffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }
        const detector = PitchDetector.forFloat32Array(44100);
        const [detectedPitch, detectedClarity] = detector.findPitch(float32Array, 44100);
        updateTuner(detectedPitch, detectedClarity);
      };

      AudioRecord.on('data', handleData);
      dataListenerRef.current = handleData;

      AudioRecord.start();

    } catch (error) {
      console.error('Failed to start tuner:', error);
    }
  };

  const stopTuning = async () => {
    setIsTuning(false);
    AudioRecord.stop();
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
  };

  const updateTuner = (detectedPitch: number | null, detectedClarity: number) => {
    if (detectedPitch === null || detectedClarity < 0.8) {
      setPitch(null);
      setNote(null);
      setClarity(detectedClarity);
      setCents(0);
      return;
    }

    setPitch(detectedPitch);
    setClarity(detectedClarity);

    // Calculate note and cents
    const n = 12 * Math.log2(detectedPitch / 440) + 69;
    const noteIndex = Math.round(n) % 12;
    setNote(NOTES[noteIndex]);

    const diff = n - Math.round(n);
    const centsDiff = diff * 100;
    setCents(centsDiff);

    Animated.spring(needleAnim, {
      toValue: centsDiff,
      useNativeDriver: true,
    }).start();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Guitar Tuner</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.tunerDisplay}>
          <View style={styles.gaugeContainer}>
            <View style={styles.gauge}>
              {/* Scale Markers */}
              {[-50, -25, 0, 25, 50].map((val) => (
                <View 
                  key={val} 
                  style={[
                    styles.marker, 
                    { transform: [{ translateX: val * 2 }] },
                    val === 0 && styles.centerMarker
                  ]} 
                />
              ))}
              
              {/* Needle */}
              <Animated.View 
                style={[
                  styles.needle, 
                  { 
                    transform: [
                      { translateX: needleAnim.interpolate({
                        inputRange: [-50, 50],
                        outputRange: [-100, 100],
                        extrapolate: 'clamp'
                      }) }
                    ] 
                  }
                ]} 
              />
            </View>
          </View>

          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>{note || '-'}</Text>
            <Text style={styles.centsText}>
              {cents > 0 ? '+' : ''}{Math.round(cents)} cents
            </Text>
          </View>

          <View style={styles.statusContainer}>
            <Text style={[
              styles.statusText,
              Math.abs(cents) < 5 && clarity > 0.8 ? styles.inTune : {}
            ]}>
              {clarity < 0.5 ? 'Listening...' : Math.abs(cents) < 5 ? 'In Tune' : cents < 0 ? 'Too Low' : 'Too High'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.frequencyText}>
            {pitch ? `${pitch.toFixed(1)} Hz` : '--- Hz'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '85%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: COLORS.text,
  },
  tunerDisplay: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  gaugeContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  gauge: {
    width: 200,
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  marker: {
    position: 'absolute',
    top: -5,
    width: 1,
    height: 14,
    backgroundColor: COLORS.textSecondary,
  },
  centerMarker: {
    backgroundColor: COLORS.primary,
    width: 2,
    height: 20,
    top: -8,
  },
  needle: {
    position: 'absolute',
    top: -15,
    width: 2,
    height: 34,
    backgroundColor: COLORS.secondary,
    zIndex: 10,
  },
  noteContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  noteText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  centsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statusContainer: {
    height: 30,
  },
  statusText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  inTune: {
    color: '#4CAF50',
  },
  footer: {
    marginTop: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    paddingTop: SPACING.md,
  },
  frequencyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
});

export default Tuner;
