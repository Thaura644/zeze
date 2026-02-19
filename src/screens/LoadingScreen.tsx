import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import GuitarLogo from '@/components/GuitarLogo';

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.logoContainer}>
        <View style={styles.logoRow}>
          <GuitarLogo size={64} />
          <Text style={styles.text}>ZEZE</Text>
        </View>
        <Text style={styles.subtitle}>Analyzing the strings of your favorite songs...</Text>
      </View>
      <View style={styles.loaderContainer}>
        <View style={styles.circularProgressContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
          <Text style={styles.progressPercent}>75%</Text>
        </View>
        <Text style={styles.analysisTitle}>AI Analysis in progress...</Text>
        <Text style={styles.analysisSubtitle}>Detecting chords and techniques...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background, // Deep black (#121212)
    paddingVertical: SPACING.xxl * 2,
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  text: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    opacity: 0.8,
  },
  loaderContainer: {
    alignItems: 'center',
    width: '100%',
  },
  circularProgressContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 10,
    borderColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  spinner: {
    position: 'absolute',
    transform: [{ scale: 4 }],
    opacity: 0.3,
  },
  progressPercent: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    fontSize: 48,
  },
  analysisTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  analysisSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
});

export default LoadingScreen;