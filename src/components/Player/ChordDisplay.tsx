import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Chord } from '@/types/music';

interface ChordDisplayProps {
  chord: Chord | null;
  isPlaying?: boolean;
  currentTime?: number;
  isHighlighted?: boolean;
}

const ChordDisplay: React.FC<ChordDisplayProps> = ({ 
  chord, 
  isPlaying = false, 
  currentTime = 0, 
  isHighlighted = false 
}) => {
  const animatedValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (chord && isPlaying) {
      // Animate when chord changes
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [chord, isPlaying, animatedValue]);

  if (!chord) {
    return (
      <View style={styles.container}>
        <Text style={styles.noChordText}>No chord</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: animatedValue }] }]}>
      <View style={styles.chordInfo}>
        <Text style={styles.chordName}>{chord.name}</Text>
        <Text style={styles.chordTiming}>
          {Math.floor(chord.startTime)}s - {Math.floor(chord.startTime + chord.duration)}s
        </Text>
      </View>
      
      {/* Finger positions visualization */}
      <View style={styles.fingerPositions}>
        {chord.fingerPositions.map((position, index) => (
          <View key={index} style={styles.fingerPosition}>
            <Text style={styles.fingerText}>
              String: {6 - position.string}, Fret: {position.fret}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3a3a3a',
  },
  chordInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  chordName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 5,
  },
  chordTiming: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.7,
  },
  fingerPositions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  fingerPosition: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 8,
    margin: 4,
  },
  fingerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noChordText: {
    color: '#ffffff',
    fontSize: 18,
    opacity: 0.5,
  },
});

export default ChordDisplay;