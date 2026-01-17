import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { LEARNING_ROAMMAP } from '@/data/learningRoadmap';
import ExerciseGeneratorScreen from './ExerciseGeneratorScreen';
import UnifiedAudioPlayer from '@/components/Player/UnifiedAudioPlayer';

const { width } = Dimensions.get('window');

interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  duration: number;
  tempo?: number;
  key?: string;
  tablature?: any;
  chords?: any[];
  sections?: any[];
}

const LearningView: React.FC = () => {
  const navigation = useNavigation();
  const [showExerciseGenerator, setShowExerciseGenerator] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<AudioTrack | null>(null);

  const handleBackToSong = () => {
    navigation.goBack();
  };

  const handleGenerateExercise = () => {
    setShowExerciseGenerator(true);
  };

  const handleExerciseGenerated = (exercise: any) => {
    setCurrentExercise(exercise);
    setShowExerciseGenerator(false);
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1:
      case 2:
        return COLORS.success;
      case 3:
      case 4:
        return COLORS.warning;
      case 5:
      default:
        return COLORS.error;
    }
  };

  const renderSkillLibrary = () => {
    const skillsByCategory = LEARNING_ROAMMAP.map(category => ({
      category: category.category,
      skills: category.skills.filter(skill => {
        const difficultyMap = { beginner: 1, intermediate: 2, advanced: 3 };
        return difficultyMap[skill.difficulty] <= 2; // Show beginner to intermediate skills
      }),
    }));

    return (
      <View style={styles.librarySection}>
        <Text style={styles.sectionTitle}>Skill Library</Text>
        {skillsByCategory.map((categoryGroup, index) => (
          <View key={index} style={styles.categoryGroup}>
            <Text style={styles.categoryName}>{categoryGroup.category}</Text>
            <View style={styles.skillsGrid}>
              {categoryGroup.skills.map((skill) => (
                <TouchableOpacity
                  key={skill.id}
                  style={styles.skillCard}
                  onPress={() => {
                    // Navigate to specific skill with exercise
                    setCurrentExercise({
                      id: skill.id,
                      title: `${skill.name} Exercise`,
                      artist: 'ZEZE Practice',
                      audioUrl: '', // Would be generated
                      duration: 30,
                      tempo: 120,
                      tablature: {
                        tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
                        capo: 0,
                        notes: [],
                      },
                      chords: [],
                    });
                  }}
                >
                  <View style={[styles.skillDifficulty, { backgroundColor: getDifficultyColor(skill.difficulty === 'beginner' ? 1 : skill.difficulty === 'intermediate' ? 2 : 3) }]}>
                    <Text style={styles.difficultyText}>{skill.difficulty}</Text>
                  </View>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={styles.skillDescription}>{skill.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPracticeModes = () => (
    <View style={styles.practiceModesSection}>
      <Text style={styles.sectionTitle}>Practice Modes</Text>
      
      <TouchableOpacity
        style={styles.modeCard}
        onPress={handleGenerateExercise}
      >
        <Ionicons name="musical-notes" size={32} color={COLORS.primary} />
        <Text style={styles.modeTitle}>Exercise Generator</Text>
        <Text style={styles.modeDescription}>
          Generate custom exercises based on your skill level and preferences
        </Text>
        <View style={styles.modeFeatures}>
          <Text style={styles.feature}>• Speed control (0.25x - 2.0x)</Text>
          <Text style={styles.feature}>• Visual tablature</Text>
          <Text style={styles.feature}>• Beat synchronization</Text>
          <Text style={styles.feature}>• Multiple difficulty levels</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modeCard}
        onPress={() => {
          // Load practice jam tracks
          setCurrentExercise({
            id: 'jam-track-g-major',
            title: 'Jam Track in G Major',
            artist: 'ZEZE Backing',
            audioUrl: 'https://example.com/jam-track.mp3', // Placeholder
            duration: 180,
            tempo: 120,
            key: 'G',
            tablature: {
              tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
              capo: 0,
              notes: [
                // G major scale notes
                { string: 6, fret: 3, time: 0, duration: 1, chord: 'G' },
                { string: 5, fret: 2, time: 1, duration: 1, chord: 'B' },
                { string: 4, fret: 0, time: 2, duration: 1, chord: 'D' },
                // ... more notes
              ],
            },
            sections: [
              { name: 'Intro', startTime: 0, duration: 16 },
              { name: 'Verse', startTime: 16, duration: 32 },
              { name: 'Chorus', startTime: 48, duration: 32 },
              { name: 'Bridge', startTime: 80, duration: 24 },
              { name: 'Solo', startTime: 104, duration: 48 },
              { name: 'Outro', startTime: 152, duration: 28 },
            ],
          });
        }}
      >
        <Ionicons name="radio" size={32} color={COLORS.secondary} />
        <Text style={styles.modeTitle}>Jam Tracks</Text>
        <Text style={styles.modeDescription}>
          Play along with backing tracks in different keys and styles
        </Text>
        <View style={styles.modeFeatures}>
          <Text style={styles.feature}>• Full band backing</Text>
          <Text style={styles.feature}>• Multiple styles</Text>
          <Text style={styles.feature}>• Tempo flexibility</Text>
          <Text style={styles.feature}>• Loop sections</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modeCard}
        onPress={() => {
          // Load ear training exercises
          setCurrentExercise({
            id: 'ear-training-intervals',
            title: 'Ear Training - Interval Recognition',
            artist: 'ZEZE Learning',
            audioUrl: 'https://example.com/ear-training.mp3', // Placeholder
            duration: 60,
            tempo: 100,
            tablature: {
              tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
              capo: 0,
              notes: [],
            },
          });
        }}
      >
        <Ionicons name="ear" size={32} color={COLORS.accent} />
        <Text style={styles.modeTitle}>Ear Training</Text>
        <Text style={styles.modeDescription}>
          Improve your musical ear with interval and chord recognition exercises
        </Text>
        <View style={styles.modeFeatures}>
          <Text style={styles.feature}>• Interval recognition</Text>
          <Text style={styles.feature}>• Chord identification</Text>
          <Text style={styles.feature}>• Progressive difficulty</Text>
          <Text style={styles.feature}>• Instant feedback</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderQuickExercises = () => (
    <View style={styles.quickExercisesSection}>
      <Text style={styles.sectionTitle}>Quick Exercises</Text>
      
      <View style={styles.quickExerciseGrid}>
        {[
          { id: 'warmup', name: 'Quick Warmup', duration: '5 min', icon: 'flame-outline' },
          { id: 'scales', name: 'Scale Practice', duration: '10 min', icon: 'repeat-outline' },
          { id: 'chords', name: 'Chord Changes', duration: '15 min', icon: 'library-outline' },
          { id: 'rhythm', name: 'Rhythm Training', duration: '8 min', icon: 'time-outline' },
        ].map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            style={styles.quickExerciseCard}
            onPress={() => {
              // Generate quick exercise based on type
              setCurrentExercise({
                id: exercise.id,
                title: exercise.name,
                artist: 'ZEZE Quick',
                audioUrl: 'https://example.com/quick-exercise.mp3', // Placeholder
                duration: parseInt(exercise.duration) * 60,
                tempo: 100,
                tablature: {
                  tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
                  capo: 0,
                  notes: [],
                },
              });
            }}
          >
            <Ionicons name={exercise.icon as any} size={24} color={COLORS.primary} />
            <Text style={styles.quickExerciseName}>{exercise.name}</Text>
            <Text style={styles.quickExerciseDuration}>{exercise.duration}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // If we have a current exercise, show the unified player
  if (currentExercise) {
    return (
      <UnifiedAudioPlayer
        track={currentExercise}
        showTablature={true}
        showChords={true}
        showSections={true}
        onClose={() => setCurrentExercise(null)}
        enableRecording={true}
        enablePracticeMode={true}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToSong} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>🎸 Learning Hub</Text>
        <TouchableOpacity
          style={styles.exerciseButton}
          onPress={handleGenerateExercise}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Practice Stats Overview */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>4.5</Text>
              <Text style={styles.statLabel}>Hours Practiced</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>Skills Mastered</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>67%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        {/* Practice Modes */}
        {renderPracticeModes()}

        {/* Quick Exercises */}
        {renderQuickExercises()}

        {/* Skill Library */}
        {renderSkillLibrary()}
      </ScrollView>

      {/* Exercise Generator Modal */}
      <Modal
        visible={showExerciseGenerator}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ExerciseGeneratorScreen />
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  backButton: {
    padding: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  exerciseButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    fontWeight: 'bold',
  },
  
  // Stats Section
  statsSection: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.xs,
  },
  statNumber: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Practice Modes Section
  practiceModesSection: {
    marginBottom: SPACING.xl,
  },
  modeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.soft,
  },
  modeTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  modeDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  modeFeatures: {
    gap: SPACING.xs,
  },
  feature: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },

  // Quick Exercises Section
  quickExercisesSection: {
    marginBottom: SPACING.xl,
  },
  quickExerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  quickExerciseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  quickExerciseName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  quickExerciseDuration: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },

  // Skill Library Section
  librarySection: {
    marginBottom: SPACING.xl,
  },
  categoryGroup: {
    marginBottom: SPACING.lg,
  },
  categoryName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  skillCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  skillDifficulty: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  difficultyText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  skillName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  skillDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
});

export default LearningView;