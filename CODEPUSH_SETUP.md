# CodePush + Backend Version Management Setup

Your React Native app now has a sophisticated version management system with Microsoft CodePush for OTA (Over-The-Air) updates AND backend-triggered automatic updates!

## 🚀 Features

✅ **Automatic Version Checking**: Backend validates app version on every API request
✅ **Smart Update Flow**: Different handling for CodePush updates vs store updates  
✅ **Force Updates**: Backend can force critical updates for unsupported versions
✅ **Analytics**: Track version adoption and update success rates
✅ **Seamless UX**: Updates happen transparently in the background

## 📋 Setup Checklist

### 1. Configure Environment Variables
Add these to your `.env` file:

```bash
# Mobile App Versions
IOS_APP_VERSION=1.0.0
IOS_MIN_VERSION=1.0.0
ANDROID_APP_VERSION=1.0.0
ANDROID_MIN_VERSION=1.0.0

# CodePush Deployment Keys
CODEPUSH_IOS_DEPLOYMENT_KEY=your-ios-key
CODEPUSH_ANDROID_DEPLOYMENT_KEY=your-android-key

# Force Update Settings (optional)
IOS_FORCE_UPDATE=false
ANDROID_FORCE_UPDATE=false
```

### 2. Install CodePush CLI
```bash
npm install -g appcenter-cli
```

### 3. Create AppCenter Account
- Sign up at https://appcenter.ms
- Create a new organization and app
- Get deployment keys from the dashboard

### 4. Run Database Migration
```bash
# Apply the database schema
cd backend
psql $DATABASE_URL -f migrations/001_app_version_table.sql
```

### 5. Configure Native Projects

#### iOS (ios/Podfile):
```ruby
pod 'CodePush', :path => '../node_modules/react-native-code-push'
```

#### Android (android/app/build.gradle):
```gradle
apply from: "../../node_modules/react-native-code-push/android/codepush.gradle"
```

### 6. Test the Flow
```bash
# Start backend
cd backend && npm run dev

# Start frontend
npm start

# Backend will automatically check versions and trigger updates!
```

## 🔄 How It Works

### Version Check Flow:
1. **App Starts** → `CodePushWrapper` runs version check
2. **API Request** → Backend receives platform & version headers  
3. **Backend Validation** → Compares current vs required versions
4. **Smart Response** → Returns appropriate update instructions:
   - `is_current: true` → No action needed
   - `codepush_available: true` → Trigger OTA update
   - `update_required: true` → Force immediate update
   - `is_unsupported: true` → Direct to app store

### Update Scenarios:

| Scenario | Backend Response | User Action |
|----------|------------------|-------------|
| App is current | ✅ `is_current: true` | None |
| Minor update available | 📱 `codepush_available: true` | Automatic OTA |
| Critical update | ⚡ `update_required: true` | Forced immediate |
| Version too old | ❌ `is_unsupported: true` | Store update |

## 📊 Backend API Endpoints

### Check Version (Automatic)
```http
POST /api/version/check
Headers:
  platform: ios|android
  app_version: 1.0.0
```

### Version Info
```http
GET /api/version/info?platform=ios
```

### Force Update (Admin)
```http
POST /api/version/force-update
{
  "platform": "ios",
  "min_version": "1.1.0",
  "message": "Security update required"
}
```

## 🎯 Release Updates

### CodePush Updates (OTA):
```bash
# Production release
appcenter codepush release-react -a <owner>/<app-name> -d Production

# Staging release  
appcenter codepush release-react -a <owner>/<app-name> -d Staging
```

### Backend Version Updates:
1. Update environment variables
2. Restart backend server
3. All apps will detect the change on next request

## 📱 Client Integration

### Automatic Integration:
- ✅ `CodePushWrapper` handles all version checking
- ✅ `VersionManager` provides API to backend
- ✅ `ApiService` includes version headers automatically
- ✅ `Toast` notifications for user feedback
- ✅ Loading overlays for critical updates

### Manual Version Check:
```typescript
import VersionManager from './services/versionManager';

const versionManager = VersionManager.getInstance();
await versionManager.forceUpdateCheck({
  onCodePushAvailable: () => console.log('OTA update available'),
  onForceUpdateRequired: () => console.log('Force update needed'),
  onUpdateNotAvailable: () => console.log('App is current'),
  onUpdateUnsupported: () => console.log('Version unsupported'),
});
```

## 📁 Files Added/Modified

### Backend:
- ✅ `backend/routes/version.js` - Version management API
- ✅ `backend/migrations/001_app_version_table.sql` - Database schema

### Frontend:
- ✅ `services/versionManager.ts` - Client version management
- ✅ `components/CodePushWrapper.tsx` - Update UI component
- ✅ `src/services/api.ts` - Version headers integration
- ✅ `app.json` - CodePush plugin config
- ✅ `plugins/codepush.js` - Expo compatibility

### Configuration:
- ✅ `codepush.config.js` - Deployment key config
- ✅ `.env.example` - Environment variables

## 🔧 Monitoring & Analytics

### Database Analytics:
```sql
-- Track version adoption
SELECT 
  current_version,
  COUNT(*) as installs,
  MAX(created_at) as last_seen
FROM app_version_checks 
GROUP BY current_version;

-- Update success rates
SELECT 
  DATE(created_at) as date,
  COUNT(*) as checks,
  COUNT(CASE WHEN needs_update THEN 1 END) as outdated
FROM app_version_checks 
GROUP BY DATE(created_at);
```

## 🎉 Benefits

- **Zero Store Delays**: Push critical fixes instantly
- **Backend Control**: Remote version management
- **Analytics**: Track update adoption rates  
- **User Friendly**: Transparent updates with good UX
- **Fallback Safe**: Unsupported versions guided to store
- **Automated**: No manual intervention needed

Your app now has enterprise-grade version management! 🚀