# Personal Task Mobile (Android)

This is the Android mobile starter app for the existing Personal Task backend.

## What is implemented

- Expo React Native scaffold
- Secure JWT token storage using `expo-secure-store`
- Auth flow wired to existing backend routes:
  - `POST /api/db-auth/login`
  - `POST /api/db-auth/register`
  - `GET /api/db-auth/me`
- Task list screen wired to existing DB task routes:
  - `GET /api/db-tasks`
  - `PUT /api/db-tasks/{task_id}` (mark complete)

## Prerequisites

- Node.js 20+
- Android Studio and emulator
- Running backend server

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   copy .env.example .env
   ```
3. Start Expo:
   ```bash
   npm run start
   ```
4. Run Android:
   ```bash
   npm run android
   ```

## Environment

Use the backend API base URL that Android emulator can reach:

- Emulator: `http://10.0.2.2:8000`
- Physical device: use your computer LAN IP, for example `http://192.168.1.10:8000`

Set this in `.env`:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

## Next implementation slices

- Projects screen and task creation flow
- Dashboard and calendar read screens
- Google Sign-In (native) integration
- Chatbot and chat history screens
- Offline cache and sync strategy
