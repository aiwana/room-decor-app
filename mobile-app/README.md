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
  components/design/  - FloorPlanCanvas, FurnitureCatalog, View3D
  features/       - Feature-specific logic
  services/       - API client & endpoints
  hooks/          - Custom React hooks
  store/          - Zustand stores (auth, design)
  types/          - TypeScript types
  utils/          - Utility functions
  constants/      - App constants
```

## Main Feature Flow

```
Chụp ảnh phòng → AI Scan (backend) → Floor Plan 2D
                                            ↓
                                  Editor 2D (kéo thả nội thất)
                                            ↓
                                  Xem 3D (Three.js trong WebView)
```

1. **Capture**: `capture.tsx` dùng `expo-image-picker` chụp ảnh, upload lên backend
2. **AI Scan**: Backend gọi vision API (GPT-4o hoặc mock) tạo floor plan (tường, kích thước)
3. **Editor 2D**: `editor/[id].tsx` hiển thị floor plan + catalog nội thất, kéo thả đặt đồ
4. **View 3D**: Toggle sang 3D, WebView render Three.js (tường extrude + furniture box)
