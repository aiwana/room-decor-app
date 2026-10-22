# RoomDecor Mobile App

App React Native (Expo) để chụp ảnh căn phòng và đặt thử nội thất lên ảnh. Giao diện giữ theo bản Room Decor AI cũ (nền tối, màu cam), chức năng theo bản Spring Boot mới.

## Công nghệ

- **Expo SDK 52** + **Expo Router 4** (định tuyến theo thư mục `app/`)
- **TypeScript** (strict)
- **Zustand** (trạng thái đăng nhập), **Axios** (gọi API)
- **expo-secure-store** (lưu token), **AsyncStorage** (dữ liệu thiết kế trên máy)
- **react-native-gesture-handler** + **react-native-reanimated** (kéo, xoay, phóng to nội thất)

## Chạy app

```bash
cd mobile-app
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npx expo start -c
```

Mở bằng Expo Go hoặc Android Emulator (phím `a`).

## Chế độ dữ liệu (file `.env`)

| Biến | Ý nghĩa |
|---|---|
| `EXPO_PUBLIC_USE_MOCK=true` | Dữ liệu giả trong app, không cần backend (mặc định). Đăng nhập bằng email bất kỳ. |
| `EXPO_PUBLIC_USE_MOCK=false` | Gọi backend Spring Boot thật. |
| `EXPO_PUBLIC_API_URL` | Địa chỉ backend, **có `/api` ở cuối**. Emulator: `http://10.0.2.2:8080/api`. Điện thoại thật: `http://<IP LAN máy tính>:8080/api`. |

Sửa `.env` xong phải chạy lại `npx expo start -c`. Màn **Hồ sơ → Cài đặt** có nút "Kiểm tra kết nối".

## Màn hình

| Màn | File | API |
|---|---|---|
| Đăng nhập / Đăng ký | `app/(auth)/login.tsx`, `register.tsx` | `POST /api/auth/login`, `/register` |
| Home | `app/(main)/(tabs)/index.tsx` | `GET /api/designs`, `/api/furniture` |
| Thiết kế mới | `app/(main)/(tabs)/new-design.tsx` | `POST /api/room-images/upload`, `POST /api/designs` |
| Thiết kế của tôi | `app/(main)/(tabs)/designs.tsx` | `GET /api/designs`, `DELETE /api/designs/{id}` |
| Hồ sơ | `app/(main)/(tabs)/profile.tsx` | `GET /api/users/me` |
| Trình chỉnh sửa 2D | `app/(main)/editor/[id].tsx` | `GET /api/designs/{id}`, `POST /api/ai/suggest-layout` |
| Danh mục nội thất | `app/(main)/furniture/index.tsx`, `[id].tsx` | `GET /api/furniture`, `/search`, `/{id}` |
| Cài đặt | `app/(main)/settings.tsx` | (kiểm tra kết nối) |

App **bắt buộc đăng nhập**: `app/(main)/_layout.tsx` chuyển về `/login` khi chưa đăng nhập hoặc token hết hạn.

## Những phần tạm thời (chờ backend)

- **Vị trí nội thất** lưu trên máy (`src/services/local-store.ts`) vì backend chưa có `PUT /api/designs/{id}`. Khi có API, chỉ sửa `savePlacements()` trong `src/services/design-api.ts`.
- **Ảnh phòng** hiển thị bằng bản trên máy vì backend chưa phục vụ file ở `/files/**`.
- **Nội thất mẫu** (`src/mock/furniture.ts`, id bắt đầu bằng `sample-`) dùng khi bảng `furniture` trống.
- **AI gợi ý**: backend đang trả danh sách rỗng, app tạo gợi ý mẫu và ghi rõ là mẫu.
- **3D**: trình chỉnh sửa hiện là 2D. Phần hiển thị mỗi món đồ nằm trong `src/components/editor/PlacedItem.tsx`, bản 3D (React Three Fiber, GLB) sẽ thay phần này.

Tọa độ món đồ (`x`, `y`) lưu theo tỉ lệ 0..1 của ảnh phòng, `rotation` theo độ, `scale` là hệ số phóng to (khớp bảng `furniture_placements`).

## Cấu trúc

```
app/                      Định tuyến (Expo Router)
  (auth)/                 Đăng nhập, đăng ký
  (main)/(tabs)/          4 tab: Home | Thiết kế mới | Của tôi | Hồ sơ
  (main)/editor/[id].tsx  Trình chỉnh sửa 2D
  (main)/furniture/       Danh mục + chi tiết nội thất
src/
  components/             common, home, design, furniture, editor
  constants/              colors, furniture (danh mục), cấu hình API
  hooks/                  useAsync, useDesigns, useFurniture, useRoomImagePicker
  mock/                   Nội thất mẫu
  services/               api-client, api-error và *-api.ts cho từng nhóm API
  store/                  auth-store (Zustand)
  types/                  Kiểu dữ liệu khớp DTO backend
  utils/                  format, validation
```

## Kiểm tra code

```bash
npm run typecheck
npm run lint
```
