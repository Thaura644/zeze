import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider, useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';

import { store } from '@/store';
import HomeScreen from '@/screens/HomeScreen';
import PlayerScreen from '@/screens/PlayerScreen';
import LoadingScreen from '@/screens/LoadingScreen';
import { AudioProcessingService } from '@/services/audioProcessing';
import { Song } from '@/types/music';
import { loadSong } from '@/store/slices/playerSlice';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

const Stack = createStackNavigator();

// Mock authentication for UI prototype
const useMockAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = () => {
    if (email && password) {
      setIsAuthenticated(true);
      return true;
    }
    Alert.alert('Error', 'Please enter email and password');
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
  };

  return {
    isAuthenticated,
    email,
    password,
    setEmail,
    setPassword,
    login,
    logout,
  };
};

// Login Screen Component
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const { email, password, setEmail, setPassword, login } = useMockAuth();

  const handleLogin = () => {
    if (login()) {
      onLogin();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loginContent}>
          <View style={styles.header}>
            <Text style={styles.title}>🎸 ZEZE</Text>
            <Text style={styles.subtitle}>Your AI-powered guitar tutor</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.demoText}>
              Demo Mode: Enter any details to proceed
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

// Wrapper component for authenticated app
const AuthenticatedApp = () => {
  const dispatch = useDispatch();

  const handleYouTubeProcessing = async (youtubeUrl: string) => {
    try {
      const response = await AudioProcessingService.processYouTubeUrl({
        youtubeUrl,
        userPreferences: {
          targetKey: 'C',
          difficultyLevel: 3,
        },
      });

      if (response.status === 'completed' && response.results) {
        const song: Song = {
          id: response.results.song_id,
          title: response.results.title,
          artist: response.results.artist,
          youtubeId: '',
          videoUrl: response.results.video_url || '',
          duration: response.results.duration,
          tempo: response.results.tempo,
          key: response.results.key,
          chords: response.results.chords.map(chord => ({
            name: chord.name,
            startTime: chord.startTime,
            duration: chord.duration,
            fingerPositions: chord.fingerPositions,
          })),
          difficulty: response.results.difficulty,
          processedAt: new Date(response.results.processed_at || Date.now()),
        };

        dispatch(loadSong(song));
        return song;
      }
    } catch (error) {
      console.error('Error processing YouTube URL:', error);
      Alert.alert('Error', 'Failed to process YouTube URL');
    }
    return null;
  };

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          ...TYPOGRAPHY.h3,
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="Home"
        options={{ title: 'ZEZE', headerShown: false }}
      >
        {(props) => (
          <HomeScreen
            {...props}
            onYouTubeProcess={handleYouTubeProcessing}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ title: 'Practice Session', headerShown: false }}
      />
      <Stack.Screen
        name="Loading"
        component={LoadingScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        {!isLoggedIn ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <NavigationContainer theme={{
            dark: true,
            colors: {
              primary: COLORS.primary,
              background: COLORS.background,
              card: COLORS.surface,
              text: COLORS.text,
              border: COLORS.glassBorder,
              notification: COLORS.secondary,
            }
          }}>
            <AuthenticatedApp />
          </NavigationContainer>
        )}
      </Provider>
      <Toast />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  loginContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    opacity: 0.8,
  },
  form: {
    width: '100%',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.soft,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.text,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.soft,
  },
  loginButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  forgotPasswordText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.secondary,
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  demoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});

export default App;