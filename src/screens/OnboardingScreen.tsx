import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  TextInput,
  TextStyle,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import GuitarLogo from '@/components/GuitarLogo';

const { width, height } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: 'welcome' | 'carousel' | 'account' | 'profile' | 'demo_song';
  image?: string;
  options?: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'ZEZE',
    description: 'Learn any song, any key, any technique',
    type: 'welcome',
  },
  {
    id: 'feature1',
    title: 'Real-time Chord Detection',
    description: 'See chords as you play with our advanced AI engine.',
    type: 'carousel',
  },
  {
    id: 'feature2',
    title: 'Interactive Fretboard',
    description: 'Visualize finger positions and master the neck.',
    type: 'carousel',
  },
  {
    id: 'feature3',
    title: 'Learn from YouTube',
    description: 'Paste a link and start practicing your favorite songs.',
    type: 'carousel',
  },
  {
    id: 'profile',
    title: 'Personalize Your Experience',
    description: 'Tell us a bit about your guitar journey.',
    type: 'profile',
  },
  {
    id: 'demo_song',
    title: 'Start with a Song',
    description: 'Choose a demo song to try out the player right away.',
    type: 'demo_song',
    options: ['Let It Be - The Beatles', 'Wonderwall - Oasis', 'Smoke on the Water - Deep Purple'],
  },
  {
    id: 'account',
    title: 'Your Journey Starts Here',
    description: 'Choose how you want to continue.',
    type: 'account',
  },
];

interface Profile {
  skillLevel: string;
  preferredTuning: string;
}

const OnboardingScreen = ({ 
    onComplete,
    onGuestLogin,
    onLogin 
}: { 
    onComplete: (profile?: Profile, demoSong?: string) => void;
    onGuestLogin: (profile: Profile, demoSong?: string) => void;
    onLogin: (profile: Profile, demoSong?: string) => void;
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const [profile, setProfile] = useState<Profile>({
    skillLevel: 'Beginner',
    preferredTuning: 'Standard',
  });

  const [selectedDemoSong, setSelectedDemoSong] = useState<string | null>(null);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentStep + 1,
        animated: true,
      });
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(profile, selectedDemoSong || undefined);
    }
  };

  const renderStep = ({ item, index }: { item: OnboardingStep; index: number }) => {
    switch (item.type) {
      case 'welcome':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.welcomeContent}>
              <GuitarLogo size={150} style={styles.logo} />
              <Text style={styles.welcomeTitle}>{item.title}</Text>
              <Text style={styles.welcomeSubtitle}>{item.description}</Text>

              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={handleNext}
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'carousel':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.placeholderIcon} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        );
      case 'profile':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{item.title}</Text>
            
            <Text style={styles.sectionLabel}>Skill Level</Text>
            <View style={styles.chipGroup}>
              {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.chip,
                    profile.skillLevel === level && styles.chipActive
                  ]}
                  onPress={() => setProfile({ ...profile, skillLevel: level })}
                >
                  <Text style={[
                    styles.chipText,
                    profile.skillLevel === level && styles.chipTextActive
                  ]}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Preferred Tuning</Text>
            <View style={styles.chipGroup}>
              {['Standard', 'Drop D', 'Eb Standard'].map((tuning) => (
                <TouchableOpacity
                  key={tuning}
                  style={[
                    styles.chip,
                    profile.preferredTuning === tuning && styles.chipActive
                  ]}
                  onPress={() => setProfile({ ...profile, preferredTuning: tuning })}
                >
                  <Text style={[
                    styles.chipText,
                    profile.preferredTuning === tuning && styles.chipTextActive
                  ]}>{tuning}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 'demo_song':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.songList}>
              {item.options?.map((song) => (
                <TouchableOpacity
                  key={song}
                  style={[
                    styles.songItem,
                    selectedDemoSong === song && styles.songItemActive
                  ]}
                  onPress={() => setSelectedDemoSong(song)}
                >
                  <Text style={[
                    styles.songItemText,
                    selectedDemoSong === song && styles.songItemTextActive
                  ]}>{song}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.songItem,
                  selectedDemoSong === 'None' && styles.songItemActive
                ]}
                onPress={() => setSelectedDemoSong('None')}
              >
                <Text style={[
                  styles.songItemText,
                  selectedDemoSong === 'None' && styles.songItemTextActive
                ]}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'account':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
            
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => onLogin(profile, selectedDemoSong || undefined)}>
                <Text style={styles.primaryButtonText}>Sign Up / Sign In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={() => onGuestLogin(profile, selectedDemoSong || undefined)}>
                <Text style={styles.secondaryButtonText}>Continue as Guest</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Animated.FlatList
        ref={flatListRef}
        data={ONBOARDING_STEPS}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEnabled={currentStep < ONBOARDING_STEPS.length - 1}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentStep(index);
        }}
      />

      {currentStep > 0 && (
      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_STEPS.map((_, index) => {
            const opacity = scrollX.interpolate({
              inputRange: [(index - 1) * width, index * width, (index + 1) * width],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            const scale = scrollX.interpolate({
              inputRange: [(index - 1) * width, index * width, (index + 1) * width],
              outputRange: [0.8, 1.2, 0.8],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={index}
                style={[styles.dot, { opacity, transform: [{ scale }] }]}
              />
            );
          })}
        </View>

        {currentStep < ONBOARDING_STEPS.length - 1 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  stepContainer: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logo: {
    marginBottom: SPACING.xl,
  },
  placeholderIcon: {
    width: 150,
    height: 150,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 75,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  title: {
    ...TYPOGRAPHY.h1 as TextStyle,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  welcomeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  welcomeTitle: {
    ...TYPOGRAPHY.h1 as TextStyle,
    color: COLORS.text,
    fontSize: 64,
    fontWeight: '900',
    marginBottom: SPACING.xs,
  },
  welcomeSubtitle: {
    ...TYPOGRAPHY.body as TextStyle,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 18,
    marginBottom: SPACING.xxl,
  },
  getStartedButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.round,
    ...SHADOWS.medium,
  },
  getStartedButtonText: {
    ...TYPOGRAPHY.button as TextStyle,
    color: COLORS.background,
    fontSize: 18,
  },
  description: {
    ...TYPOGRAPHY.body as TextStyle,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  microcopy: {
    ...TYPOGRAPHY.caption as TextStyle,
    color: COLORS.textMuted,
    marginTop: SPACING.xl,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagination: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  nextButtonText: {
    ...TYPOGRAPHY.button as TextStyle,
    color: COLORS.text,
  },
  buttonGroup: {
    width: '100%',
    marginTop: SPACING.xxl,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button as TextStyle,
    color: COLORS.text,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.button as TextStyle,
    color: COLORS.text,
  },
  sectionLabel: {
    ...TYPOGRAPHY.h3 as TextStyle,
    color: COLORS.textSecondary,
    alignSelf: 'flex-start',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...TYPOGRAPHY.body as TextStyle,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  songList: {
    width: '100%',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  songItem: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  songItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  songItemText: {
    ...TYPOGRAPHY.body as TextStyle,
    color: COLORS.text,
  },
  songItemTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;
