import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { Chord } from '@/types/music';

interface BasicFretboardProps {
  chord: Chord | null;
  showNumbers?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const BasicFretboard: React.FC<BasicFretboardProps> = ({ chord, showNumbers = true }) => {
  const fretboardWidth = Math.min(screenWidth - 40, 350);
  const fretboardHeight = 150;
  const fretCount = 5;
  const stringCount = 6;
  const fretWidth = fretboardWidth / fretCount;
  const stringSpacing = fretboardHeight / (stringCount - 1);

  // String tuning (standard EADGBe from bottom to top)
  const tuning = ['E', 'A', 'D', 'G', 'B', 'e'];

  const renderFrets = () => {
    const frets = [];
    for (let i = 1; i <= fretCount; i++) {
      frets.push(
        <Line
          key={`fret-${i}`}
          x1={i * fretWidth}
          y1={0}
          x2={i * fretWidth}
          y2={fretboardHeight}
          stroke="#silver"
          strokeWidth={2}
        />
      );
    }
    return frets;
  };

  const renderStrings = () => {
    const strings = [];
    for (let i = 0; i < stringCount; i++) {
      strings.push(
        <Line
          key={`string-${i}`}
          x1={0}
          y1={i * stringSpacing}
          x2={fretboardWidth}
          y2={i * stringSpacing}
          stroke="#cd853f"
          strokeWidth={i === 0 || i === stringCount - 1 ? 3 : 2}
        />
      );
    }
    return strings;
  };

  const renderFretNumbers = () => {
    if (!showNumbers) return null;
    
    const numbers = [];
    for (let i = 1; i <= fretCount; i++) {
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
    if (!showNumbers) return null;
    
    const notes = [];
    for (let i = 0; i < stringCount; i++) {
      notes.push(
        <SvgText
          key={`tuning-${i}`}
          x={-25}
          y={i * stringSpacing + 5}
          fontSize={12}
          fill="#ffffff"
          textAnchor="middle"
        >
          {tuning[i]}
        </SvgText>
      );
    }
    return notes;
  };

  const renderChordDots = () => {
    if (!chord) return null;
    
    const dots: JSX.Element[] = [];
    chord.fingerPositions.forEach((position, index) => {
      const x = position.fret === 0 ? fretWidth / 2 : position.fret * fretWidth - fretWidth / 2;
      const y = position.string * stringSpacing;
      
      dots.push(
        <Circle
          key={`dot-${index}`}
          cx={x}
          cy={y}
          r={8}
          fill="#ff6b6b"
          stroke="#ffffff"
          strokeWidth={2}
        />
      );
      
      // Add finger number if specified
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
    
    // Open strings (fret 0) are shown as circles
    chord.fingerPositions.forEach((position, index) => {
      if (position.fret === 0) {
        const x = fretWidth / 2;
        const y = position.string * stringSpacing;
        
        dots.push(
          <Circle
            key={`open-${index}`}
            cx={x}
            cy={y}
            r={6}
            fill="none"
            stroke="#ff6b6b"
            strokeWidth={2}
          />
        );
      }
    });
    
    return dots;
  };

  return (
    <View style={styles.container}>
      <Svg 
        width={fretboardWidth + 30} 
        height={fretboardHeight + 30}
        viewBox={`-25 -25 ${fretboardWidth + 30} ${fretboardHeight + 30}`}
      >
        {/* Nut (the top piece where strings rest) */}
        <Rect
          x={0}
          y={0}
          width={fretboardWidth}
          height={8}
          fill="#8b4513"
        />
        
        {/* Render components */}
        {renderFretNumbers()}
        {renderTuningNotes()}
        {renderStrings()}
        {renderFrets()}
        {renderChordDots()}
      </Svg>
      
      {/* Chord name below fretboard */}
      {chord && (
        <View style={styles.chordNameContainer}>
          <SvgText
            x={fretboardWidth / 2}
            y={fretboardHeight + 50}
            fontSize={18}
            fill="#ff6b6b"
            textAnchor="middle"
            fontWeight="bold"
          >
            {chord.name}
          </SvgText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#8b4513',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  chordNameContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
});

export default BasicFretboard;