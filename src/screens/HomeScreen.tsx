/* Updated HomeScreen with Learning Path CTA placeholders and roadmap display trigger */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, StatusBar, Dimensions, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '@/store';
import { processYouTubeUrl, processAudioFile, clearError } from '@/store/slices/songsSlice';
import { Song } from '@/types/music';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { LEARNING_ROAMMAP } from '@/data/learningRoadmap';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  Player: undefined;
};

type HomeScreenNavigationProp = useNavigation<RootStackParamList['Home']>;

const HomeScreen: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'youtube' | 'upload'>('youtube');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();

  const { loading, error, songs, processingStatus, processingProgress } = useSelector((state: RootState) => state.songs);

  const handleProcessYouTube = async () => {
    if (!youtubeUrl.trim()) {
      // show error
      return;
    }
    try {
      const resultAction = await dispatch(processYouTubeUrl(youtubeUrl, {}));
      handleProcessResult(resultAction);
    } catch (err) {
      // error
    }
  };

  const handleProcessResult = (resultAction: any) => {
    // Minimal placeholder for now; real UX will be added later
    if (resultAction?.payload?.results) {
      Toast.show({ type: 'success', text1: 'Learning Path', text2: 'Song processed' });
    }
  };

  // Recycling Document Picker logic kept as-is for now
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.logo}>🎸 ZEZE</Text>
        <Text style={styles.tagline}>Learn guitar with a structured learning path</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'youtube' && styles.activeTab]} onPress={() => setActiveTab('youtube')}>
            <Text style={[styles.tabText, activeTab === 'youtube' && styles.activeTabText]}>YouTube</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'upload' && styles.activeTab]} onPress={() => setActiveTab('upload')}>
            <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>Upload</Text>
          </TouchableOpacity>
        </View>
        {activeTab === 'youtube' ? (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Paste YouTube URL</Text>
            <TextInput style={styles.textInput} placeholder="https://youtube.com/.." value={youtubeUrl} onChangeText={setYoutubeUrl} />
            <TouchableOpacity style={styles.button} onPress={handleProcessYouTube}>
              <Text style={styles.buttonText}>Process Song</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Local Audio Upload (coming soon)</Text>
          </View>
        )}
      </View>

      {/* Learning Roadmap CTA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learning Roadmap</Text>
        <Text style={styles.sectionSubtitle}>Follow a guided path to master guitar techniques and theory.</Text>
        <View style={styles.roadmapList}>
          {LEARNING_ROAMMAP.map((cat) => (
            <View key={cat.category} style={styles.roadmapCategory}>
              <Text style={styles.roadmapCategoryTitle}>{cat.category}</Text>
              {cat.skills.map((s) => (
                <TouchableOpacity key={s.id} style={styles.roadmapItem} onPress={() => { /* navigate to learning view */ }}>
                  <Text style={styles.roadmapItemText}>{s.name}</Text>
                  {s.duration && <Text style={styles.roadmapItemDuration}>{s.duration}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      {songs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          {songs.map((song) => (
            <TouchableOpacity key={song.id} style={styles.songCard} onPress={() => {/* navigate to song */}}>
              <View style={styles.songIconContainer}><Text style={styles.songIcon}>🎵</Text></View>
              <View style={styles.songInfo}><Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text><Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text></View>
              <View style={styles.songMeta}><Text style={styles.songDuration}>{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</Text><View style={styles.difficultyBadge}><Text style={styles.difficultyText}>Lvl {song.difficulty}</Text></View></View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { paddingBottom: SPACING.xxl },
  header: { paddingTop: 40, paddingBottom: SPACING.xl, alignItems: 'center' },
  logo: { fontSize: 48, color: COLORS.primary },
  tagline: { color: COLORS.textSecondary, ...TYPOGRAPHY.body, textAlign: 'center' },
  card: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder, ...SHADOWS.soft },
  tabContainer: { flexDirection: 'row', borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontWeight: '600' },
  activeTabText: { color: COLORS.text },
  inputContainer: { paddingVertical: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 },
  textInput: { backgroundColor: COLORS.surfaceLight, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.glassBorder },
  button: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', marginTop: SPACING.md },
  buttonText: { color: COLORS.text, fontWeight: '600' },
  section: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.md },
  sectionSubtitle: { color: COLORS.textSecondary, ...TYPOGRAPHY.body },
  roadmapList: { flexDirection: 'column', gap: SPACING.sm },
  roadmapCategory: { marginBottom: SPACING.md },
  roadmapCategoryTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  roadmapItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  roadmapItemText: { color: COLORS.text },
  roadmapItemDuration: { color: COLORS.textSecondary, fontSize: 12 },
  songCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACINGmd, borderWidth: 1, borderColor: COLORS.glassBorder },
  songIconContainer: { width: 48, height: 48, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  songIcon: { fontSize: 24 },
  songInfo: { flex: 1 },
  songTitle: { ...TYPOGRAPHY.h3, fontSize: 16, color: COLORS.text, marginBottom: 4 },
  songArtist: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  songMeta: { alignItems: 'flex-end' },
  songDuration: { ...TYPOGRAPHY.caption, fontSize: 12 },
  difficultyBadge: { backgroundColor: COLORS.surfaceLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  difficultyText: { color: COLORS.secondary, fontSize: 10, fontWeight: 'bold' },
  // Minor placeholders for future: learning view styles
});

export default HomeScreen;
