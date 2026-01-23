import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextStyle,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import GuitarLogo from '@/components/GuitarLogo';
import { Provider, useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';
import CodePushWrapper from './components/CodePushWrapper';

import { store } from '@/store';
import HomeScreen from '@/screens/HomeScreen';
import PlayerScreen from '@/screens/PlayerScreen';
import LoadingScreen from '@/screens/LoadingScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import LearningView from '@/screens/LearningView';
import ApiService from '@/services/api';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import OnboardingScreen from '@/screens/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const Stack = createStackNavigator();

// Login Screen Component
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter both email and password',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.login(email, password);
      if (response.data?.tokens) {
        onLogin();
        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: 'Logged in successfully',
        });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.message || 'Invalid credentials',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !username) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.register({
        email,
        password,
        username,
        display_name: username,
      });

      if (response.data?.tokens) {
        onLogin();
        Toast.show({
          type: 'success',
          text1: 'Account Created',
          text2: 'Welcome to ZEZE!',
        });
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: error.message || 'Could not create account',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Toast.show({
      type: 'info',
      text1: 'Coming Soon',
      text2: 'Google Login will be available in the next update',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.loginContent}>
            <View style={styles.header}>
              <GuitarLogo size={64} style={styles.logo} />
              <Text style={styles.title}>ZEZE</Text>
              <Text style={styles.subtitle}>
                {isRegistering ? 'Create your account' : 'Your AI-powered guitar tutor'}
              </Text>
            </View>

            <View style={styles.form}>
              {isRegistering && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="guitarhero123"
                    placeholderTextColor={COLORS.textMuted}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              )}

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

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.disabledButton]}
                onPress={isRegistering ? handleRegister : handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {isRegistering ? 'Sign Up' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              {!isRegistering && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
              >
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleMode}
                onPress={() => setIsRegistering(!isRegistering)}
              >
                <Text style={styles.toggleModeText}>
                  {isRegistering
                    ? 'Already have an account? Sign In'
                    : 'Don\'t have an account? Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

// Wrapper component for authenticated app
const AuthenticatedApp = () => {
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
          ...TYPOGRAPHY.h3 as TextStyle,
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'ZEZE', headerShown: false }}
      />
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
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'User Profile', headerShown: true }}
      />
      <Stack.Screen
        name="Learning"
        component={LearningView}
        options={{ title: 'Learn Guitar', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Check if onboarding is completed
        const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        if (onboardingCompleted !== 'true') {
          setShowOnboarding(true);
        }

        // 2. Check auth
        const tokens = await ApiService.getStoredTokens();
        if (tokens?.accessToken) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('App init error:', error);
      } finally {
        setCheckingAuth(false);
      }
    };
    initApp();
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    setShowOnboarding(false);
  };

  const getDeviceId = async () => {
    let deviceId = await AsyncStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = uuidv4();
      await AsyncStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const handleGuestLogin = async () => {
    try {
      const deviceId = await getDeviceId();
      const response = await ApiService.guestLogin(deviceId);
      if (response.data?.tokens) {
        setIsLoggedIn(true);
        await handleOnboardingComplete();
        Toast.show({
          type: 'success',
          text1: 'Welcome!',
          text2: 'Continue as Guest',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Guest Login Failed',
        text2: error.message,
      });
    }
  };

  if (checkingAuth) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <Provider store={store}>
          <OnboardingScreen 
            onComplete={handleOnboardingComplete}
            onGuestLogin={handleGuestLogin}
            onLogin={() => {
              // Just close onboarding and show login
              handleOnboardingComplete();
            }}
          />
        </Provider>
        <Toast />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <CodePushWrapper>
          {!isLoggedIn ? (
            <LoginScreen onLogin={() => setIsLoggedIn(true)} />
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
        </CodePushWrapper>
      </Provider>
      <Toast />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    minHeight: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loginContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h1 as TextStyle,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body as TextStyle,
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
    ...TYPOGRAPHY.caption as TextStyle,
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
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    ...TYPOGRAPHY.button as TextStyle,
    color: COLORS.text,
    fontSize: 16,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  forgotPasswordText: {
    ...TYPOGRAPHY.caption as TextStyle,
    color: COLORS.secondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.glassBorder,
  },
  dividerText: {
    ...TYPOGRAPHY.caption as TextStyle,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.md,
  },
  socialButton: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  socialButtonText: {
    ...TYPOGRAPHY.button as TextStyle,
    color: COLORS.text,
    fontSize: 14,
  },
  toggleMode: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  toggleModeText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontSize: 14,
  },
});

export default App;