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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Tuning with AI</Text>
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
    gap: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.secondary,
  },
});

export default LoadingScreen;