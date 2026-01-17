# ZEZE Deployment Guide

This guide covers deploying the ZEZE mobile app and its backend.

## 🚀 Backend (Render)

The backend is configured for deployment on [Render](https://render.com).

### Prerequisites
1. Create a Render account.
2. Create a Supabase account for the database and time-series data.
3. Get your YouTube API key (if applicable).

### Steps
1. Push the project to GitHub.
2. Connect your repo to Render.
3. Select the `backend` directory as the root.
4. Render will automatically detect the `render.yaml` file.
5. Set the following Environment Variables in Render:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `DATABASE_URL` (if not using Supabase as the primary DB)
   - `REDIS_URL` (Render Redis)

## 📱 Mobile App (Expo)

### Local Development
```bash
npm install
npm start
```

### Production Build (EAS)
1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Configure build: `eas build:configure`
4. Build for Android/iOS:
   ```bash
   eas build --platform ios
   eas build --platform android
   ```

## 🔗 Environment Configuration

### Frontend (.env)
```env
EXPO_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
```

### Backend (.env)
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```
