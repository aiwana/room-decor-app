# RoomDecor Mobile App

App React Native (Expo) để chụp ảnh căn phòng, để AI dựng mặt bằng 2D, đặt thử nội thất và xem trước 3D. Giao diện giữ theo bản Room Decor AI cũ (nền tối, màu cam), chức năng theo bản Spring Boot mới.

## Công nghệ

- **Expo SDK 52** + **Expo Router 4** (định tuyến theo thư mục `app/`)
- **TypeScript** (strict)
- **Zustand** (trạng thái đăng nhập), **Axios** (gọi API)
- **expo-secure-store** (lưu token), **AsyncStorage** (dữ liệu thiết kế trên máy)
- **react-native-gesture-handler** + **react-native-reanimated** (kéo, xoay, phóng to nội thất)
- **react-native-svg** (mặt bằng 2D), **react-native-webview** + **Three.js** (xem 3D, tải từ CDN nên cần Internet)

Hướng dẫn cài đặt đầy đủ cho cả dự án: [docs/](../docs/README.md).

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
| Thiết kế mới | `app/(main)/(tabs)/new-design.tsx` | `POST /api/room-images/upload`, `POST /api/designs`, `POST /api/ai/scan-room` |
| Thiết kế của tôi | `app/(main)/(tabs)/designs.tsx` | `GET /api/designs`, `DELETE /api/designs/{id}` |
| Hồ sơ | `app/(main)/(tabs)/profile.tsx` | `GET /api/users/me` |
| Trình chỉnh sửa (ảnh, mặt bằng 2D, 3D) | `app/(main)/editor/[id].tsx` | `GET/PUT /api/designs/{id}`, `GET /api/floor-plans/by-room-image/{id}`, `POST /api/ai/scan-room`, `POST /api/ai/suggest-layout` |
| Danh mục nội thất | `app/(main)/furniture/index.tsx`, `[id].tsx` | `GET /api/furniture`, `/search`, `/{id}` |
| Cài đặt | `app/(main)/settings.tsx` | (kiểm tra kết nối) |

App **bắt buộc đăng nhập**: `app/(main)/_layout.tsx` chuyển về `/login` khi chưa đăng nhập hoặc token hết hạn.

## Những phần tạm thời (chờ backend)

- **Vị trí nội thất** lưu trên máy (`src/services/local-store.ts`) và gửi lên `PUT /api/designs/{id}` khi bấm Lưu. Nội thất mẫu (`sample-...`) chỉ lưu trên máy vì máy chủ không có các món này.
- **Ảnh phòng** hiển thị bằng bản trên máy cho nhanh (backend đã phục vụ file ở `/files/**`).
- **Mặt bằng 2D**: backend chưa có `OPENAI_API_KEY` thì AI trả về phòng mẫu 4m x 4m. Chế độ mock cũng dùng phòng mẫu này.
- **Nội thất mẫu** (`src/mock/furniture.ts`, id bắt đầu bằng `sample-`) dùng khi bảng `furniture` trống.
- **AI gợi ý**: backend đang trả danh sách rỗng, app tạo gợi ý mẫu và ghi rõ là mẫu.
- **3D**: `src/components/design/View3D.tsx` vẽ phòng bằng Three.js trong WebView, nội thất là các khối hộp theo kích thước thật. Sau này có model GLB thì thay khối hộp bằng model.

Tọa độ món đồ (`x`, `y`) lưu theo tỉ lệ 0..1 của ảnh phòng (trên mặt bằng/3D là `x * roomWidth`, `y * roomDepth` mét), `rotation` theo độ, `scale` là hệ số phóng to (khớp bảng `furniture_placements`).

## Cấu trúc

```
app/                      Định tuyến (Expo Router)
  (auth)/                 Đăng nhập, đăng ký
  (main)/(tabs)/          4 tab: Home | Thiết kế mới | Của tôi | Hồ sơ
  (main)/editor/[id].tsx  Trình chỉnh sửa: ảnh phòng | mặt bằng 2D | 3D
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
