import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { LEARNING_ROAMMAP } from '@/data/learningRoadmap';

const LearningView: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { skillId } = route.params as { skillId: string };

  const skill = LEARNING_ROAMMAP.flatMap(cat => cat.skills).find(s => s.id === skillId);

  if (!skill) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>Skill not found</Text>
      </View>
    );
  }

  const handleBackToSong = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToSong} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Song</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎸 Learning</Text>
      </View>

      <View style={styles.skillCard}>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(skill.difficulty) }]}>
          <Text style={styles.difficultyText}>{skill.difficulty.toUpperCase()}</Text>
        </View>

        <Text style={styles.skillTitle}>{skill.name}</Text>
        <Text style={styles.skillDescription}>{skill.description}</Text>

        {skill.duration && (
          <Text style={styles.skillDuration}>⏱️ Estimated time: {skill.duration}</Text>
        )}

        {skill.prerequisites && skill.prerequisites.length > 0 && (
          <View style={styles.prerequisites}>
            <Text style={styles.prerequisitesTitle}>Prerequisites:</Text>
            {skill.prerequisites.map((prereq, index) => (
              <Text key={index} style={styles.prerequisiteItem}>• {prereq}</Text>
            ))}
          </View>
        )}

        {skill.exercises && skill.exercises.length > 0 && (
          <View style={styles.exercises}>
            <Text style={styles.exercisesTitle}>Practice Exercises:</Text>
            {skill.exercises.map((exercise, index) => (
              <Text key={index} style={styles.exerciseItem}>• {exercise}</Text>
            ))}
          </View>
        )}

        {skill.videoUrl && (
          <TouchableOpacity style={styles.videoButton}>
            <Text style={styles.videoButtonText}>🎥 Watch Tutorial</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.markCompleteButton}>
          <Text style={styles.markCompleteButtonText}>✅ Mark as Learned</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backToSongButton} onPress={handleBackToSong}>
        <Text style={styles.backToSongButtonText}>🔙 Back to Song</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner': return '#4CAF50';
    case 'intermediate': return '#FF9800';
    case 'advanced': return '#F44336';
    default: return COLORS.surfaceLight;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  backButtonText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
  },
  skillCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.soft,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  difficultyText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  skillTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  skillDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  skillDuration: {
    ...TYPOGRAPHY.caption,
    color: COLORS.secondary,
    marginBottom: SPACING.lg,
  },
  prerequisites: {
    marginBottom: SPACING.lg,
  },
  prerequisitesTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontSize: 18,
  },
  prerequisiteItem: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.md,
  },
  exercises: {
    marginBottom: SPACING.lg,
  },
  exercisesTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontSize: 18,
  },
  exerciseItem: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.md,
  },
  videoButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  videoButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  markCompleteButton: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  markCompleteButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  backToSongButton: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  backToSongButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default LearningView;