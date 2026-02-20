import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import apiService from '../services/api';
import Toast from 'react-native-toast-message';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = (userId: string | null) => {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (userId) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
          registerTokenWithBackend(token);
        }
      });

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification);

        // Show in-app toast for received notification
        Toast.show({
          type: 'info',
          text1: notification.request.content.title || 'New Notification',
          text2: notification.request.content.body || '',
          onPress: () => {
            // Handle notification press
          }
        });
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received:', response);
        // Handle notification interaction here (e.g., navigate to a specific screen)
      });

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, [userId]);

  const registerTokenWithBackend = async (token: string) => {
    try {
      await apiService.registerPushToken(token, {
        type: Platform.OS,
        name: Device.deviceName,
        model: Device.modelName,
      });
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
    }
  };

  return {
    expoPushToken,
    notification,
  };
};

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') {
    return null;
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
    } catch (e) {
      console.error('Error getting push token', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}
