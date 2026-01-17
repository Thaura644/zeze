import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface TablatureNote {
  string: number;
  fret: number;
  time: number;
  duration: number;
  chord?: string;
  technique?: string;
}

interface Tablature {
  tuning: string[];
  capo: number;
  notes: TablatureNote[];
}

interface TablatureViewProps {
  tablature: Tablature;
  currentBeat?: number;
  showFretNumbers?: boolean;
  showChordNames?: boolean;
}

const TablatureView: React.FC<TablatureViewProps> = ({
  tablature,
  currentBeat = 0,
  showFretNumbers = true,
  showChordNames = true,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const playbackLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate playback line
    Animated.timing(playbackLineAnim, {
      toValue: currentBeat * 80, // 80px per beat
      duration: 200,
      useNativeDriver: false,
    }).start();

    // Auto-scroll to keep current position visible
    if (scrollViewRef.current && currentBeat > 2) {
      scrollViewRef.current.scrollTo({
        x: (currentBeat - 2) * 80,
        animated: true,
      });
    }
  }, [currentBeat]);

  const renderString = (stringIndex: number) => {
    const stringNotes = tablature.notes.filter(note => note.string === stringIndex);
    const stringName = tablature.tuning[stringIndex];
    
    return (
      <View key={stringIndex} style={styles.stringContainer}>
        {/* String name and capo info */}
        <View style={styles.stringLabel}>
          <Text style={styles.stringName}>
            {stringName}
            {stringIndex === 0 && tablature.capo > 0 && ` (capo ${tablature.capo})`}
          </Text>
        </View>
        
        {/* String line */}
        <View style={styles.stringLine}>
          {/* Notes on this string */}
          {stringNotes.map((note, index) => {
            const isActive = Math.floor(note.time) === currentBeat;
            const isPassed = note.time < currentBeat;
            
            return (
              <View
                key={index}
                style={[
                  styles.noteContainer,
                  {
                    left: note.time * 80,
                  },
                ]}
              >
                {/* Fret number */}
                {showFretNumbers && (
                  <View
                    style={[
                      styles.fretNumber,
                      isActive && styles.activeFretNumber,
                      isPassed && styles.passedFretNumber,
                    ]}
                  >
                    <Text
                      style={[
                        styles.fretText,
                        isActive && styles.activeFretText,
                      ]}
                    >
                      {note.fret === 0 ? '0' : note.fret}
                    </Text>
                  </View>
                )}
                
                {/* Technique indicator */}
                {note.technique && (
                  <View style={styles.techniqueIndicator}>
                    <Text style={styles.techniqueText}>
                      {getTechniqueSymbol(note.technique)}
                    </Text>
                  </View>
                )}
                
                {/* Chord name */}
                {showChordNames && note.chord && stringIndex === 0 && (
                  <Text style={styles.chordName}>{note.chord}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const getTechniqueSymbol = (technique: string) => {
    switch (technique) {
      case 'hammer-on': return 'H';
      case 'pull-off': return 'P';
      case 'slide': return 'S';
      case 'bend': return 'B';
      case 'vibrato': return '~';
      default: return technique[0]?.toUpperCase() || '';
    }
  };

  const calculateTablatureWidth = () => {
    if (tablature.notes.length === 0) return width;
    const maxTime = Math.max(...tablature.notes.map(note => note.time));
    return Math.max(width, (maxTime + 2) * 80);
  };

  const renderMeasureLines = () => {
    const totalBeats = Math.ceil(Math.max(...tablature.notes.map(note => note.time)) / 4) * 4;
    const measures = [];
    
    for (let i = 0; i <= totalBeats; i += 4) {
      measures.push(
        <View
          key={i}
          style={[styles.measureLine, { left: i * 80 }]}
        />
      );
    }
    
    return measures;
  };

  return (
    <View style={styles.container}>
      {/* Tablature header */}
      <View style={styles.header}>
        <Text style={styles.title}>Guitar Tablature</Text>
        {tablature.capo > 0 && (
          <Text style={styles.capoInfo}>Capo: {tablature.capo}</Text>
        )}
      </View>

      {/* Playback line indicator */}
      <View style={styles.playbackLineContainer}>
        <Animated.View
          style={[
            styles.playbackLine,
            {
              transform: [{ translateX: playbackLineAnim }],
            },
          ]}
        />
      </View>

      {/* Scrollable tablature */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.tablatureContent,
          { width: calculateTablatureWidth() },
        ]}
      >
        {/* Measure lines */}
        {renderMeasureLines()}
        
        {/* Beat numbers */}
        <View style={styles.beatNumbers}>
          {Array.from({ length: Math.ceil(calculateTablatureWidth() / 80) }, (_, i) => (
            <Text key={i} style={styles.beatNumber}>
              {i + 1}
            </Text>
          ))}
        </View>

        {/* Guitar strings */}
        <View style={styles.stringsContainer}>
          {tablature.tuning.map((_, stringIndex) => renderString(stringIndex + 1))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.legendText}>Current</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#666' }]} />
            <Text style={styles.legendText}>Played</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#333' }]} />
            <Text style={styles.legendText}>Upcoming</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  capoInfo: {
    fontSize: 14,
    color: '#FF6B6B',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  playbackLineContainer: {
    height: 2,
    marginBottom: 10,
    position: 'relative',
  },
  playbackLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 300,
    backgroundColor: '#FF6B6B',
    zIndex: 10,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  tablatureContent: {
    minHeight: 200,
    position: 'relative',
  },
  beatNumbers: {
    flexDirection: 'row',
    height: 20,
    marginBottom: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 5,
  },
  beatNumber: {
    width: 80,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
  },
  measureLine: {
    position: 'absolute',
    top: 30,
    width: 2,
    height: 150,
    backgroundColor: '#444',
    zIndex: 1,
  },
  stringsContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
  },
  stringContainer: {
    height: 25,
    marginBottom: 2,
    position: 'relative',
  },
  stringLabel: {
    position: 'absolute',
    left: -30,
    width: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stringName: {
    fontSize: 10,
    color: '#ccc',
    fontWeight: 'bold',
  },
  stringLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#666',
    position: 'relative',
    marginLeft: 0,
  },
  noteContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 3,
  },
  fretNumber: {
    backgroundColor: '#333',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
  },
  activeFretNumber: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  passedFretNumber: {
    backgroundColor: '#444',
    borderColor: '#666',
  },
  fretText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  activeFretText: {
    color: '#fff',
  },
  techniqueIndicator: {
    position: 'absolute',
    top: -15,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 16,
    alignItems: 'center',
  },
  techniqueText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
  },
  chordName: {
    position: 'absolute',
    top: -25,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF6B6B',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ccc',
  },
  legendItems: {
    flexDirection: 'row',
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#ccc',
  },
});

export default TablatureView;