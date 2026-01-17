import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

interface GuitarLogoProps {
  size?: number;
  color?: string;
  style?: any;
}

const GuitarLogo: React.FC<GuitarLogoProps> = ({ 
  size = 48, 
  color = COLORS.primary,
  style 
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Guitar body */}
      <View style={[styles.guitarBody, { backgroundColor: color }]} />
      {/* Guitar neck */}
      <View style={[styles.guitarNeck, { backgroundColor: color }]} />
      {/* Sound hole */}
      <View style={[styles.guitarHole, { backgroundColor: COLORS.background }]} />
      {/* Pickguard */}
      <View style={[styles.pickguard, { backgroundColor: COLORS.textMuted, opacity: 0.3 }]} />
      {/* Strings */}
      <View style={styles.strings}>
        <View style={[styles.string, { backgroundColor: COLORS.textSecondary }]} />
        <View style={[styles.string, { backgroundColor: COLORS.textSecondary }]} />
        <View style={[styles.string, { backgroundColor: COLORS.textSecondary }]} />
        <View style={[styles.string, { backgroundColor: COLORS.textSecondary }]} />
      </View>
      {/* Tuning pegs */}
      <View style={styles.tuningPegs}>
        <View style={[styles.tuningPeg, { backgroundColor: COLORS.textMuted }]} />
        <View style={[styles.tuningPeg, { backgroundColor: COLORS.textMuted }]} />
        <View style={[styles.tuningPeg, { backgroundColor: COLORS.textMuted }]} />
        <View style={[styles.tuningPeg, { backgroundColor: COLORS.textMuted }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  guitarBody: {
    position: 'absolute',
    width: '70%',
    height: '55%',
    bottom: '20%',
    left: '15%',
    borderRadius: 40,
    transform: [{ scaleX: 0.8 }],
  },
  guitarNeck: {
    position: 'absolute',
    width: '25%',
    height: '60%',
    top: '10%',
    left: '37.5%',
    borderRadius: 3,
  },
  guitarHole: {
    position: 'absolute',
    width: '20%',
    height: '20%',
    bottom: '35%',
    left: '40%',
    borderRadius: 50,
  },
  pickguard: {
    position: 'absolute',
    width: '25%',
    height: '15%',
    bottom: '25%',
    right: '20%',
    borderRadius: 5,
    transform: [{ rotate: '25deg' }],
  },
  strings: {
    position: 'absolute',
    top: '15%',
    left: '42%',
    width: '16%',
    height: '60%',
    justifyContent: 'space-between',
  },
  string: {
    height: 1,
    width: '100%',
  },
  tuningPegs: {
    position: 'absolute',
    top: '5%',
    left: '38%',
    width: '24%',
    height: '10%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tuningPeg: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

export default GuitarLogo;