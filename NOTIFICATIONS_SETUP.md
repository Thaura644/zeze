# ZEZE Notifications Setup Guide

This document explains how to complete the setup for Push Notifications (including FCM for Android) in the ZEZE app.

## Overview

The app is now configured to support:
- **Push Notifications** via Expo Notifications.
- **In-app Notifications** using foreground listeners and `react-native-toast-message`.
- **Scheduled Reminders** via backend cron jobs.

## Prerequisites

1. An [Expo account](https://expo.dev/).
2. A [Firebase project](https://console.firebase.google.com/) for FCM (Android only).

## 1. Expo Configuration

To send real push notifications, you need to register the app with EAS (Expo Application Services).

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```bash
   eas login
   ```

3. Initialize EAS in the project:
   ```bash
   eas project:init
   ```

4. Get your `projectId` from the Expo dashboard and update `app.json` or ensure it's picked up by `expo-constants`.

## 2. FCM Setup (Android)

For Android devices, Expo uses FCM (Firebase Cloud Messaging).

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project or select an existing one.
3. Add an Android app to your Firebase project. Use the package name found in `app.json` (e.g., `com.zeze.app`).
4. Download the `google-services.json` file.
5. Place `google-services.json` in the root directory of the project.
6. Update `app.json` to include the path to this file:
   ```json
   {
     "expo": {
       "android": {
         "googleServicesFile": "./google-services.json"
       }
     }
   }
   ```
7. Upload your FCM server key to Expo:
   ```bash
   eas credentials:fill
   ```
   (Select Android > production/development > Push Notifications > Upload a new FCM Server Key)

## 3. Backend Configuration

The backend uses `expo-server-sdk` to communicate with Expo's push service.

Ensure your `backend/.env` file has any necessary environment variables if you decide to use a custom Expo access token for enhanced security (optional).

## 4. Testing

### Test via API
You can send a test notification to yourself using the provided test endpoint:
```bash
# Register your device first by logging into the app on a physical device
# Then call:
POST /api/notifications/test
Authorization: Bearer <your_access_token>
```

### Test via Expo Push Tool
You can also use the [Expo Push Notification Tool](https://expo.dev/notifications) by pasting your device's Expo Push Token (which is logged in the console when the app starts).

## Troubleshooting

- **Token Registration Failed**: Ensure you are running the app on a **physical device**. Push notifications do not work on simulators/emulators.
- **Missing Permissions**: The app will request permissions on first launch. If denied, you must enable them manually in system settings.
- **Backend Connection**: Ensure the `EXPO_PUBLIC_API_URL` in your frontend `.env` points to the correct backend address.
