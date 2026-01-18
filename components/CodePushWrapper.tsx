import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import VersionManager from '../services/versionManager';

interface CodePushWrapperProps {
  children: React.ReactNode;
}

const CodePushWrapper: React.FC<CodePushWrapperProps> = ({ children }) => {
  const [updateStatus, setUpdateStatus] = useState<string>('current'); // Default to 'current' to not block app
  const [updateMessage, setUpdateMessage] = useState<string>('');

  useEffect(() => {
    const versionManager = VersionManager.getInstance();
    
    const checkVersion = async () => {
      try {
        const result = await versionManager.checkAppVersion({
          onCodePushAvailable: () => {
            setUpdateStatus('downloading');
            setUpdateMessage('Downloading update...');
            Toast.show({
              type: 'info',
              text1: 'Update Available',
              text2: 'A new version is being downloaded',
            });
          },
          onForceUpdateRequired: () => {
            setUpdateStatus('required');
            setUpdateMessage('A required update is available. Installing now...');
            Toast.show({
              type: 'warning',
              text1: 'Required Update',
              text2: 'A critical update is being installed',
              visibilityTime: 5000,
            });
          },
          onUpdateNotAvailable: () => {
            setUpdateStatus('current');
            setUpdateMessage('Your app is up to date');
            console.log('App is up to date');
          },
          onUpdateUnsupported: () => {
            setUpdateStatus('unsupported');
            setUpdateMessage('Your app version is no longer supported. Please update from the app store.');
            Toast.show({
              type: 'error',
              text1: 'Update Required',
              text2: 'Please update from the App Store or Play Store',
              visibilityTime: 10000,
            });
          },
          onError: (error) => {
            // On error, don't block the app - just log and continue
            setUpdateStatus('current');
            setUpdateMessage('');
            console.warn('Version check error (non-blocking):', error?.message || error);
            // Don't show toast for network errors - it's not critical
          }
        });

        if (result) {
          console.log('Version check completed:', result);
          setUpdateStatus('completed');
          setUpdateMessage('');
        } else {
          // If no result (network error), just continue with the app
          setUpdateStatus('current');
          setUpdateMessage('');
        }

      } catch (error) {
        // On any error, don't block the app
        console.warn('Version check failed (non-blocking):', error);
        setUpdateStatus('current');
        setUpdateMessage('');
      }
    };

    // Initial check with a small delay to not block app startup
    const initialTimeout = setTimeout(checkVersion, 2000);

    // Schedule periodic checks (every 6 hours)
    const interval = setInterval(checkVersion, 6 * 60 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Show loading overlay during critical updates
  if (updateStatus === 'required' || updateStatus === 'downloading') {
    return (
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.message}>{updateMessage}</Text>
          <Text style={styles.submessage}>Please wait, this will only take a moment...</Text>
        </View>
      </View>
    );
  }

  // For unsupported versions, show a message but still allow app usage
  if (updateStatus === 'unsupported') {
    return (
      <>
        {children}
        <View style={styles.warningBar}>
          <Text style={styles.warningText}>⚠️ {updateMessage}</Text>
        </View>
      </>
    );
  }

  // Normal app rendering for all other states (including 'checking', 'error', 'current', 'completed')
  return <>{children}</>;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  submessage: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  warningBar: {
    backgroundColor: '#FF6B6B',
    padding: 10,
    alignItems: 'center',
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CodePushWrapper;