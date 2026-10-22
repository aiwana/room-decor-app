# RoomDecor Mobile App

React Native (Expo) mobile app for room decoration and design.

## Tech Stack

- **Expo SDK 52** + **Expo Router 4**
- **TypeScript**
- **Zustand** for state management
- **Axios** for API communication
- **expo-secure-store** for token storage

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm start

# Run on Android / iOS
npm run android
npm run ios
```

## Environment

Create `.env` in the project root:

```
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

## Project Structure

```
app/              - Expo Router routes
  (auth)/         - Login & register screens
  (main)/        - Main app tabs + editor
src/
  components/     - Reusable UI components
  features/       - Feature-specific logic
  services/       - API client & endpoints
  hooks/          - Custom React hooks
  store/          - Zustand stores
  types/          - TypeScript types
  utils/          - Utility functions
  constants/      - App constants
```
