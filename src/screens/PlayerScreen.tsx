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
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

const PlayerScreen: React.FC = () => {
  const dispatch = useDispatch();

  const {
    currentSong,
    loading,
  } = useSelector((state: RootState) => state.player);

  const navigation = useNavigation();

  React.useEffect(() => {
    if (!currentSong && !loading) {
      navigation.navigate('Home' as any);
      Toast.show({
        type: 'info',
        text1: 'No Song Selected',
        text2: 'Please select or process a song first',
      });
    }
  }, [currentSong, loading, navigation]);

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
      {/* TODO: add tuner functionality */}
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