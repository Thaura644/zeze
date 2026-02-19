import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Dimensions } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PracticeResultsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { results } = route.params || {
    results: {
      accuracy: 95,
      time: '12:45',
      chordsPlayed: 342,
      feedback: "Great job! You're improving on your transitions."
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice Session</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.accuracySection}>
          <View style={styles.circularProgress}>
            <Text style={styles.accuracyPercent}>{results.accuracy}%</Text>
            <Text style={styles.accuracyLabel}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{results.time}</Text>
            <Text style={styles.statLabel}>Practice Time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{results.chordsPlayed}</Text>
            <Text style={styles.statLabel}>Chords Played</Text>
          </View>
        </View>

        <View style={styles.feedbackCard}>
          <Ionicons name="star" size={32} color={COLORS.primary} />
          <Text style={styles.feedbackText}>{results.feedback}</Text>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  accuracySection: {
    marginVertical: SPACING.xxl,
    alignItems: 'center',
  },
  circularProgress: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 12,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
    shadowColor: COLORS.primary,
  },
  accuracyPercent: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    fontSize: 48,
  },
  accuracyLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  feedbackCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  feedbackText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  doneButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    fontSize: 18,
  },
});

export default PracticeResultsScreen;
