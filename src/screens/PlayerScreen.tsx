import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadSong } from '@/store/slices/playerSlice';
import { RootState } from '@/store';
import { Song } from '@/types/music';
import Player from '@/components/Player/Player';
import GuitarTuner from '@/components/Tuner/GuitarTuner';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

const PlayerScreen: React.FC = () => {
  const dispatch = useDispatch();
  const [showTuner, setShowTuner] = React.useState(false);

  const {
    currentSong,
    loading,
  } = useSelector((state: RootState) => state.player);

  const navigation = useNavigation<any>();

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
      <TouchableOpacity
        style={styles.tunerButton}
        onPress={() => setShowTuner(true)}
      >
        <Text style={styles.tunerButtonText}>🎸 Tuner</Text>
      </TouchableOpacity>
      <GuitarTuner
        visible={showTuner}
        onClose={() => setShowTuner(false)}
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
  tunerButton: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tunerButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
  },
});

export default PlayerScreen;