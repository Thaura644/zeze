import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadSong } from '@/store/slices/playerSlice';
import { RootState } from '@/store';
import { Song } from '@/types/music';
import Player from '@/components/Player/Player';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';

const PlayerScreen: React.FC = () => {
  const dispatch = useDispatch();

  const {
    currentSong,
    loading,
  } = useSelector((state: RootState) => state.player);

  React.useEffect(() => {
    if (!currentSong) {
      const demoSong: Song = {
        id: 'demo-song',
        title: 'Wonderwall',
        artist: 'Oasis',
        youtubeId: 'hLQl3wQQbQ0',
        videoUrl: 'https://www.youtube.com/embed/hLQl3wQQbQ0',
        duration: 258,
        tempo: 86,
        key: 'G',
        chords: [
          { name: 'Em', startTime: 0, duration: 3.5, fingerPositions: [{ fret: 0, string: 0 }] },
          { name: 'C', startTime: 3.5, duration: 2, fingerPositions: [{ fret: 0, string: 1 }] },
          { name: 'D', startTime: 5.5, duration: 2, fingerPositions: [{ fret: 2, string: 1 }] },
          { name: 'G', startTime: 7.5, duration: 4, fingerPositions: [{ fret: 3, string: 0 }] },
          { name: 'Em', startTime: 11.5, duration: 3.5, fingerPositions: [{ fret: 0, string: 0 }] },
          { name: 'C', startTime: 15, duration: 2, fingerPositions: [{ fret: 0, string: 1 }] },
          { name: 'D', startTime: 17, duration: 2, fingerPositions: [{ fret: 2, string: 1 }] },
          { name: 'G', startTime: 19, duration: 4, fingerPositions: [{ fret: 3, string: 0 }] },
        ],
        difficulty: 3,
        processedAt: new Date().toISOString(),
      };
      dispatch(loadSong(demoSong));
    }
  }, [currentSong, dispatch]);

  const handleBack = () => {
    // Navigation will be handled by React Navigation usually, 
    // but we can pass onBack to Player if needed.
  };

  if (loading || !currentSong) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Preparing your lesson...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Player
        song={currentSong}
        onBack={handleBack}
      />
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.text,
    ...TYPOGRAPHY.body,
    marginTop: SPACING.md,
  },
});

export default PlayerScreen;