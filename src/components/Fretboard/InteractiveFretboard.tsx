import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { Chord, FingerPosition } from '@/types/music';

interface InteractiveFretboardProps {
  chords: Chord[];
  currentChordIndex: number;
  isInteractive?: boolean;
  showFretNumbers?: boolean;
  showTuningNotes?: boolean;
  onChordChange?: (chordIndex: number) => void;
  onStringPress?: (string: number, fret: number) => void;
  onSwipe?: (direction: 'left' | 'right') => void;
  transposeKey?: string;
  capoPosition?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const InteractiveFretboard: React.FC<InteractiveFretboardProps> = ({
  chords,
  currentChordIndex,
  isInteractive = true,
  showFretNumbers = true,
  showTuningNotes = true,
  onChordChange,
  onStringPress,
  onSwipe,
  transposeKey,
  capoPosition = 0,
}) => {
  const fretboardWidth = Math.min(screenWidth - 40, 350);
  const fretboardHeight = 180;
  const fretCount = 12;
  const stringCount = 6;
  const fretWidth = fretboardWidth / fretCount;
  const stringSpacing = fretboardHeight / (stringCount - 1);
  
  const [selectedFret, setSelectedFret] = useState<{ string: number; fret: number } | null>(null);
  const pan = useMemo(() => new Animated.ValueXY({ x: 0, y: 0 }), []);
  
  // String tuning (standard EADGBe from bottom to top)
  const tuning = ['E', 'A', 'D', 'G', 'B', 'e'];
  
  const currentChord = useMemo(() => {
    return chords[currentChordIndex] || null;
  }, [chords, currentChordIndex]);

  // Calculate fret positions with transposition
  const getTransposedPosition = useCallback((position: FingerPosition) => {
    if (!transposeKey || transposeKey === 'C') return position;
    
    // Simple transposition logic (would need full implementation)
    const semitoneShift = getSemitoneShift(transposeKey);
    return {
      ...position,
      fret: Math.max(0, position.fret + semitoneShift),
    };
  }, [transposeKey]);

  const getSemitoneShift = (key: string): number => {
    const keyMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return keyMap[key] || 0;
  };

  // Pan responder for horizontal swiping
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: () => isInteractive,
      onPanResponderGrant: () => {
        pan.setOffset({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const shouldSwipeLeft = gestureState.dx < -50;
        const shouldSwipeRight = gestureState.dx > 50;
        
        if (shouldSwipeLeft && currentChordIndex < chords.length - 1) {
          onChordChange?.(currentChordIndex + 1);
        } else if (shouldSwipeRight && currentChordIndex > 0) {
          onChordChange?.(currentChordIndex - 1);
        }
        
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    });
  }, [isInteractive, pan, currentChordIndex, chords.length, onChordChange]);

  const renderCapo = () => {
    if (capoPosition === 0) return null;
    
    const capoX = capoPosition * fretWidth;
    
    return (
      <>
        <Rect
          x={capoX - 5}
          y={-10}
          width={10}
          height={fretboardHeight + 20}
          fill="#4a4a4a"
          rx={5}
        />
        <SvgText
          x={capoX}
          y={fretboardHeight + 25}
          fontSize={12}
          fill="#ffffff"
          textAnchor="middle"
        >
          Capo {capoPosition}
        </SvgText>
      </>
    );
  };

  const renderFrets = () => {
    const frets: React.ReactNode[] = [];
    for (let i = 1; i <= fretCount; i++) {
      const isOctaveFret = i % 12 === 0;
      const fretColor = isOctaveFret ? "#ffd700" : "#c0c0c0";
      
      frets.push(
        <Line
          key={`fret-${i}`}
          x1={i * fretWidth}
          y1={0}
          x2={i * fretWidth}
          y2={fretboardHeight}
          stroke={fretColor}
          strokeWidth={isOctaveFret ? 3 : 2}
        />
      );
    }
    return frets;
  };

  const renderStrings = () => {
    const strings: React.ReactNode[] = [];
    for (let i = 0; i < stringCount; i++) {
      const strokeWidth = i < 2 ? 3 : i < 4 ? 2.5 : 2;
      
      strings.push(
        <Line
          key={`string-${i}`}
          x1={0}
          y1={i * stringSpacing}
          x2={fretboardWidth}
          y2={i * stringSpacing}
          stroke="#cd853f"
          strokeWidth={strokeWidth}
        />
      );
    }
    return strings;
  };

  const renderFretNumbers = () => {
    if (!showFretNumbers) return null;
    
    const numbers: React.ReactNode[] = [];
    for (let i = 1; i <= fretCount; i += 2) {
      numbers.push(
        <SvgText
          key={`fret-number-${i}`}
          x={i * fretWidth - fretWidth / 2}
          y={-15}
          fontSize={10}
          fill="#ffffff"
          textAnchor="middle"
        >
          {i}
        </SvgText>
      );
    }
    return numbers;
  };

  const renderTuningNotes = () => {
    if (!showTuningNotes) return null;
    
    const notes: React.ReactNode[] = [];
    for (let i = 0; i < stringCount; i++) {
      notes.push(
        <SvgText
          key={`tuning-${i}`}
          x={-25}
          y={i * stringSpacing + 5}
          fontSize={12}
          fill="#ffffff"
          textAnchor="middle"
          fontWeight="bold"
        >
          {tuning[i]}
        </SvgText>
      );
    }
    return notes;
  };

  const renderChordDots = () => {
    if (!currentChord) return null;
    
    const dots: React.ReactNode[] = [];
    currentChord.fingerPositions.forEach((position, index) => {
      const transposedPosition = getTransposedPosition(position);
      const x = transposedPosition.fret === 0 ? fretWidth / 2 : transposedPosition.fret * fretWidth - fretWidth / 2;
      const y = transposedPosition.string * stringSpacing;
      
      const fingerColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
      const dotColor = position.finger ? fingerColors[position.finger - 1] : '#ff6b6b';
      
      dots.push(
        <Circle
          key={`dot-${index}`}
          cx={x}
          cy={y}
          r={10}
          fill={dotColor}
          stroke="#ffffff"
          strokeWidth={2}
        />
      );
      
      if (position.finger) {
        dots.push(
          <SvgText
            key={`finger-${index}`}
            x={x}
            y={y + 4}
            fontSize={10}
            fill="#ffffff"
            textAnchor="middle"
            fontWeight="bold"
          >
            {position.finger}
          </SvgText>
        );
      }
    });
    
    // Render muted strings
    currentChord.fingerPositions.forEach((position, index) => {
      if (position.fret === -1) {
        const x = fretWidth / 2;
        const y = position.string * stringSpacing;
        
        dots.push(
          <SvgText
            key={`muted-${index}`}
            x={x}
            y={y + 4}
            fontSize={16}
            fill="#ff6b6b"
            textAnchor="middle"
            fontWeight="bold"
          >
            ✕
          </SvgText>
        );
      }
    });
    
    return dots;
  };

  const renderPositionMarkers = () => {
    const markers: React.ReactNode[] = [];
    const dotPositions = [
      { fret: 3, strings: [1, 3] },
      { fret: 5, strings: [0, 2, 4] },
      { fret: 7, strings: [1, 3] },
      { fret: 9, strings: [0, 2, 4] },
      { fret: 12, strings: [0, 2, 4] },
    ];
    
    dotPositions.forEach(({ fret, strings }) => {
      if (fret > fretCount) return;
      
      strings.forEach(stringIndex => {
        const x = fret * fretWidth - fretWidth / 2;
        const y = stringIndex * stringSpacing;
        
        markers.push(
          <Circle
            key={`marker-${fret}-${stringIndex}`}
            cx={x}
            cy={y}
            r={3}
            fill="#ffffff"
            opacity={0.6}
          />
        );
      });
    });
    
    return markers;
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.fretboardContainer,
          isInteractive && { transform: [{ translateX: pan.x }] }
        ]}
        {...(isInteractive ? panResponder.panHandlers : {})}
      >
        <Svg 
          width={fretboardWidth + 30} 
          height={fretboardHeight + 30}
          viewBox={`-25 -25 ${fretboardWidth + 30} ${fretboardHeight + 30}`}
        >
          <Rect
            x={0}
            y={0}
            width={fretboardWidth}
            height={fretboardHeight}
            fill="#8b4513"
          />
          
          <Rect
            x={0}
            y={0}
            width={fretboardWidth}
            height={8}
            fill="#654321"
          />
          
          {renderFretNumbers()}
          {renderTuningNotes()}
          {renderStrings()}
          {renderFrets()}
          {renderPositionMarkers()}
          {renderCapo()}
          {renderChordDots()}
        </Svg>
      </Animated.View>
      
      {/* Chord information */}
      {currentChord && (
        <View style={styles.chordInfo}>
          <SvgText
            x={fretboardWidth / 2}
            y={fretboardHeight + 50}
            fontSize={20}
            fill="#ff6b6b"
            textAnchor="middle"
            fontWeight="bold"
          >
            {currentChord.name}
          </SvgText>
          {transposeKey && transposeKey !== 'C' && (
            <SvgText
              x={fretboardWidth / 2}
              y={fretboardHeight + 70}
              fontSize={14}
              fill="#4ecdc4"
              textAnchor="middle"
            >
              Transposed to {transposeKey}
            </SvgText>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#8b4513',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fretboardContainer: {
    alignItems: 'center',
  },
  chordInfo: {
    marginTop: 15,
    alignItems: 'center',
  },
});

export default InteractiveFretboard;