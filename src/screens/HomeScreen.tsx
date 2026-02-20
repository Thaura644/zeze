/* Updated HomeScreen with Learning Path CTA placeholders and roadmap display trigger */
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
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';
import { RootState, AppDispatch } from '@/store';
import { processYouTubeUrl, processAudioFile, clearError, fetchPopularSongs, fetchRecommendedSongs } from '@/store/slices/songsSlice';
import { loadSong } from '@/store/slices/playerSlice';
import { Song } from '@/types/music';
import ApiService from '@/services/api';
import { isFeatureEnabled, SubscriptionTier } from '@/constants/plans';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { LEARNING_ROAMMAP } from '@/data/learningRoadmap';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  Player: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'youtube' | 'upload'>('youtube');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const { loading, error, songs, processingStatus, processingProgress } = useSelector((state: RootState) => state.songs);
  const { user } = useSelector((state: RootState) => state.profile);
  const userTier: SubscriptionTier = (user as any)?.subscription_tier || 'free';

  React.useEffect(() => {
    dispatch(fetchPopularSongs());
    dispatch(fetchRecommendedSongs());
  }, [dispatch]);

  const handleProcessYouTube = async () => {
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
      // Check tier limit (simplified frontend check)
      if (userTier === 'free' && songs.filter(s => s.processedAt).length >= 1) {
         Toast.show({
           type: 'info',
           text1: 'Plan Limit Reached',
           text2: 'Free plan is limited to 1 song process. Upgrade to Basic for more!',
         });
         return;
      }

      const resultAction = await dispatch(processYouTubeUrl(youtubeUrl));
      handleProcessResult(resultAction);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to initiate processing',
      });
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setSelectedFile(result);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick document',
      });
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || selectedFile.canceled) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select an audio file',
      });
      return;
    }

    const asset = selectedFile.assets[0];

    // In React Native, for multipart/form-data, we need an object with uri, name, and type
    const fileToUpload = {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'audio/mpeg',
    };

    try {
      const resultAction = await dispatch(processAudioFile(fileToUpload));
      handleProcessResult(resultAction);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to upload file',
      });
    }
  };

  const handleSearch = async (text: string) => {
    setSearchTerm(text);
    if (text.length > 2) {
      setIsSearching(true);
      try {
        const response = await ApiService.searchSongs({ query: text });
        if (response.data?.songs) {
          // Map to music.ts Song type
          const mappedSongs: Song[] = response.data.songs.map((s: any) => ({
             id: s.song_id,
             title: s.title,
             artist: s.artist,
             duration: s.duration_seconds,
             difficulty: s.overall_difficulty,
             tempo: s.tempo_bpm,
             key: s.original_key,
             youtubeId: '',
             videoUrl: '',
             chords: []
          }));
          setSearchResults(mappedSongs);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleProcessResult = (resultAction: any) => {
    if (processYouTubeUrl.fulfilled.match(resultAction) || processAudioFile.fulfilled.match(resultAction)) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Processing complete!',
      });

      const payload = resultAction.payload;
      if (payload && payload.results) {
        const songData = payload.results;
        const newSong: Song = {
          id: songData.song_id,
          title: songData.metadata.title,
          artist: songData.metadata.artist,
          youtubeId: songData.metadata.video_url?.split('v=')[1]?.split('&')[0] || '',
          videoUrl: songData.metadata.video_url || '',
          duration: songData.metadata.duration,
          tempo: songData.metadata.tempo_bpm,
          key: songData.metadata.original_key,
          chords: (songData.chords as any[])?.map((chord: any) => ({
            name: chord.chord || chord.name,
            startTime: chord.start_time || chord.startTime,
            duration: chord.duration,
            fingerPositions: chord.fingerPositions || [],
          })) || [],
          difficulty: songData.metadata.overall_difficulty,
          processedAt: new Date().toISOString(),
          // For now, audio playback is not available for processed songs
          audioUrl: '',
        };
        dispatch(loadSong(newSong));
        navigation.navigate('Player');
      }
    } else {
      const errorMsg = resultAction.payload as string;
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMsg || 'Failed to process song',
      });
    }
  };

  const handleSongPress = (song: Song) => {
    dispatch(loadSong(song));
    navigation.navigate('Player');
  };

  const handleRoadmapItemPress = (skillId: string) => {
    // Navigate to learning view for this skill
    navigation.navigate('Learning' as any, { skillId });
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
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.userName}>Alex</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile' as any)}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs, artists..."
            placeholderTextColor={COLORS.textMuted}
            value={searchTerm}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          {searchResults.map((song) => (
            <TouchableOpacity
              key={song.id}
              style={styles.songCard}
              onPress={() => handleSongPress(song)}
            >
              <View style={styles.songIconContainer}>
                <Text style={styles.songIcon}>🔍</Text>
              </View>
              <View style={styles.songInfo}>
                <Text style={styles.songTitle}>{song.title}</Text>
                <Text style={styles.songArtist}>{song.artist}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Practice Now CTA */}
      <TouchableOpacity style={styles.practiceNowCard}>
        <View style={styles.practiceNowContent}>
          <Text style={styles.practiceNowTitle}>Practice Now</Text>
          <Text style={styles.practiceNowSubtitle}>Daily Goal: 30 mins</Text>
          <View style={styles.progressContainerSmall}>
            <View style={styles.progressBarSmall}>
              <View style={[styles.progressFillSmall, { width: '50%' }]} />
            </View>
            <Text style={styles.progressTextSmall}>15 mins completed</Text>
          </View>
        </View>
        <View style={styles.practiceNowIcon}>
          <Text style={styles.playIconLarge}>▶</Text>
        </View>
      </TouchableOpacity>

      {/* Trending Songs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Songs</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
          {songs.length > 0 ? songs.slice(0, 5).map((song, index) => (
            <TouchableOpacity key={index} style={styles.trendingCard} onPress={() => handleSongPress(song as any)}>
              <View style={styles.trendingImagePlaceholder}>
                <Text style={styles.trendingMusicIcon}>🎵</Text>
              </View>
              <Text style={styles.trendingSongTitle} numberOfLines={1}>{song.title}</Text>
              <Text style={styles.trendingSongArtist} numberOfLines={1}>{song.artist}</Text>
            </TouchableOpacity>
          )) : exampleUrls.map((song, index) => (
            <TouchableOpacity key={index} style={styles.trendingCard} onPress={() => setYoutubeUrl(song.url)}>
              <View style={styles.trendingImagePlaceholder}>
                <Text style={styles.trendingMusicIcon}>🎵</Text>
              </View>
              <Text style={styles.trendingSongTitle} numberOfLines={1}>{song.title}</Text>
              <Text style={styles.trendingSongArtist} numberOfLines={1}>Example Artist</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.card, { marginTop: SPACING.xl }]}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'youtube' && styles.activeTab]}
            onPress={() => setActiveTab('youtube')}
          >
            <Text style={[styles.tabText, activeTab === 'youtube' && styles.activeTabText]}>YouTube</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upload' && styles.activeTab]}
            onPress={() => setActiveTab('upload')}
          >
            <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>Upload File</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'youtube' ? (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Paste YouTube URL</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. https://youtube.com/watch?v=..."
              placeholderTextColor={COLORS.textMuted}
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleProcessYouTube}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.buttonText}>Process Song</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select Audio File (MP3, WAV, etc.)</Text>
            <TouchableOpacity style={styles.filePicker} onPress={handlePickDocument}>
              <Text style={styles.filePickerText}>
                {selectedFile && !selectedFile.canceled ? selectedFile.assets[0].name : "Tap to choose file"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, (!selectedFile || loading) && styles.buttonDisabled]}
              onPress={handleUploadFile}
              disabled={loading || !selectedFile}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.buttonText}>Upload & Process</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {processingStatus === 'processing' && (
        <View style={styles.processingCard}>
          <View style={styles.processingHeader}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.processingTitle}>Processing Audio</Text>
          </View>
          <Text style={styles.processingText}>
            Analyzing chords, tempo, and generating tablature...
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${processingProgress}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>{processingProgress}%</Text>
          </View>
        </View>
      )}

      {activeTab === 'youtube' && (
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
      )}

      {/* Learning Roadmap */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎸 Learning Roadmap</Text>
        <Text style={styles.sectionSubtitle}>Follow this structured path to master guitar techniques and theory.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roadmapScroll}>
          <View style={styles.roadmapContainer}>
            {LEARNING_ROAMMAP.map((category, catIndex) => (
              <View key={category.category} style={[styles.roadmapCategory, catIndex > 0 && styles.roadmapCategoryMargin]}>
                <Text style={styles.roadmapCategoryTitle}>{category.category}</Text>
                <View style={styles.roadmapSkills}>
                  {category.skills.map((skill) => (
                    <TouchableOpacity
                      key={skill.id}
                      style={[
                        styles.roadmapSkill,
                        { backgroundColor: getDifficultyColor(skill.difficulty) }
                      ]}
                      onPress={() => handleRoadmapItemPress(skill.id)}
                    >
                      <Text style={styles.roadmapSkillTitle} numberOfLines={2}>{skill.name}</Text>
                      <View style={styles.roadmapSkillMeta}>
                        <Text style={styles.roadmapSkillDifficulty}>{skill.difficulty}</Text>
                        {skill.duration && <Text style={styles.roadmapSkillDuration}>{skill.duration}</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {songs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
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
  contentContainer: {
    paddingBottom: SPACING.xxl,
  },
  header: {
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.xs,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  profileIcon: {
    fontSize: 20,
  },
  greeting: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  userName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginTop: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.text,
  },
  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  seeAllText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    gap: SPACING.md,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: -8,
  },
  textInput: {
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.text,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  filePicker: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderStyle: 'dashed',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filePickerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
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
  processingCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.soft,
  },
  processingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  processingTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  processingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  roadmapScroll: {
    marginTop: SPACING.sm,
  },
  roadmapContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
  },
  roadmapCategory: {
    width: width * 0.8,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.soft,
  },
  roadmapCategoryMargin: {
    marginLeft: SPACING.md,
  },
  roadmapCategoryTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  roadmapSkills: {
    gap: SPACING.sm,
  },
  roadmapSkill: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  roadmapSkillTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  roadmapSkillMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roadmapSkillDifficulty: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  roadmapSkillDuration: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
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
  practiceNowCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.medium,
  },
  practiceNowContent: {
    flex: 1,
  },
  practiceNowTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  practiceNowSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  progressContainerSmall: {
    marginTop: SPACING.xs,
  },
  progressBarSmall: {
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    width: '100%',
    marginBottom: 4,
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressTextSmall: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  practiceNowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconLarge: {
    fontSize: 20,
    color: COLORS.background,
    marginLeft: 2,
  },
  trendingScroll: {
    marginLeft: -SPACING.lg,
    paddingLeft: SPACING.lg,
  },
  trendingCard: {
    width: 140,
    marginRight: SPACING.md,
  },
  trendingImagePlaceholder: {
    width: 140,
    height: 140,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  trendingMusicIcon: {
    fontSize: 40,
  },
  trendingSongTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
    color: COLORS.text,
    fontSize: 14,
  },
  trendingSongArtist: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});

export default HomeScreen;
