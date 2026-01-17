import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import { RootState, AppDispatch } from '@/store';
import { processYouTubeUrl, clearError } from '@/store/slices/songsSlice';
import { Song } from '@/types/music';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  Player: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  onYouTubeProcess?: (youtubeUrl: string) => Promise<Song | null>;
}

const HomeScreen: React.FC<HomeScreenProps> = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const { loading, error, songs } = useSelector((state: RootState) => state.songs);

  const handleProcess = async () => {
    if (!youtubeUrl.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a YouTube URL',
      });
      return;
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid YouTube URL',
      });
      return;
    }

    try {
      const result = await dispatch(processYouTubeUrl(youtubeUrl));
      if (result.payload) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Song processed successfully!',
        });
        navigation.navigate('Player');
      } else if (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to process song',
      });
    }
  };

  const handleSongPress = (song: Song) => {
    navigation.navigate('Player');
  };

  const exampleUrls = [
    { title: 'Wonderwall', url: 'https://www.youtube.com/watch?v=hLQl3wQQbQ0' },
    { title: 'Sweet Child O\' Mine', url: 'https://www.youtube.com/watch?v=5VCE6A91R1o' },
    { title: 'Let It Be', url: 'https://www.youtube.com/watch?v=CjVuo_Cov6A' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.logo}>🎸 ZEZE</Text>
        <Text style={styles.tagline}>Master your guitar with AI</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Process New Song</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Paste YouTube URL here..."
            placeholderTextColor={COLORS.textMuted}
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleProcess}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.buttonText}>Process Song</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Start Examples</Text>
        <View style={styles.examplesGrid}>
          {exampleUrls.map((example, index) => (
            <TouchableOpacity
              key={index}
              style={styles.exampleChip}
              onPress={() => setYoutubeUrl(example.url)}
            >
              <Text style={styles.exampleChipText}>{example.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {songs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          {songs.map((song) => (
            <TouchableOpacity
              key={song.id}
              style={styles.songCard}
              onPress={() => handleSongPress(song as any)}
            >
              <View style={styles.songIconContainer}>
                <Text style={styles.songIcon}>🎵</Text>
              </View>
              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
              </View>
              <View style={styles.songMeta}>
                <Text style={styles.songDuration}>
                  {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                </Text>
                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>Lvl {song.difficulty}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => dispatch(clearError())}>
            <Text style={styles.clearErrorText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: SPACING.xxl,
  },
  header: {
    paddingTop: 80,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  logo: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.soft,
  },
  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  inputContainer: {
    gap: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginBottom: SPACING.md,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  buttonDisabled: {
    backgroundColor: COLORS.surfaceLight,
    opacity: 0.5,
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  exampleChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  exampleChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  songIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  songIcon: {
    fontSize: 24,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  songArtist: {
    ...TYPOGRAPHY.caption,
  },
  songMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  songDuration: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  difficultyBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    flex: 1,
  },
  clearErrorText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: SPACING.md,
    textDecorationLine: 'underline',
  },
});

export default HomeScreen;