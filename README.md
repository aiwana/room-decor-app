# Room Decor AI

Ứng dụng mobile giúp người dùng **thiết kế / trang trí phòng bằng AI**:
chụp hoặc chọn ảnh phòng → chọn loại phòng, phong cách, màu → AI thiết kế lại → lưu → xem lịch sử.
Module phụ **Catalog vật liệu** cho phép xem sản phẩm được dùng trong thiết kế và gửi yêu cầu báo giá.

Expo SDK 57 · React Native 0.86 · Expo Router · TypeScript strict.
Giai đoạn hiện tại: **frontend dùng mock data** (chưa có backend / AI thật).

## Chạy dự án

```bash
npm install
npx expo start          # nhấn "a" để mở Android Emulator, hoặc quét QR bằng Expo Go
npm run typecheck       # kiểm tra TypeScript
npm run lint            # kiểm tra ESLint
```

Nếu vừa đổi route/thư mục mà gặp lỗi lạ: `npx expo start -c` (xoá cache).

## Luồng chính

```
Home ─► AI Decor (ảnh → loại phòng → phong cách → màu) ─► ✨ Generate ─► Result ─► Lưu ─► History
Result ─► Vật liệu được sử dụng ─► Product Detail ─► Yêu cầu báo giá
Home ─► Vật liệu nổi bật ─► Catalog ─► Product Detail
```

## Navigation

| Đường dẫn | Màn hình | Loại |
|---|---|---|
| `/` | Home | Tab |
| `/ai-decor` | AI Decor | Tab |
| `/history` | Lịch sử (`?filter=favorite`) | Tab |
| `/profile` | Profile | Tab |
| `/result/[id]` | Kết quả thiết kế | Stack |
| `/catalog` | Catalog (`?category=tile`) | Stack |
| `/catalog/[productId]` | Chi tiết sản phẩm | Stack |
| `/quote-request` | Form báo giá | Modal |

## Cấu trúc thư mục

```
src/
  app/          Chỉ chứa route (Expo Router). Mỗi file chỉ re-export từ screens/
  screens/      Code thật của từng màn hình (index.tsx + styles.ts)
  components/   common/ home/ decor/ design/ catalog/
  constants/    colors.ts (màu, spacing), decorOptions.ts (loại phòng, phong cách, màu)
  context/      DesignContext: danh sách thiết kế dùng chung
  hooks/        useAsync (tải dữ liệu), useRoomImagePicker (camera / thư viện)
  services/     Cổng duy nhất tới dữ liệu: aiService, designService, productService...
  data/mock/    Toàn bộ dữ liệu giả
  types/        Type TypeScript
  utils/        format tiền, ngày...
```

## Mock → Backend / AI thật

Màn hình **không bao giờ** import thẳng `data/mock`. Mọi dữ liệu đi qua `src/services/`.
Mỗi service có 2 nhánh: mock và gọi API (axios). Khi có backend, tạo file `.env`:

```
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
```

AI: chỉ cần sửa `generateWithApi()` trong `src/services/aiService.ts`. UI không phải sửa.
Thử màn hình lỗi của AI: đặt `MOCK_AI_FAIL_RATE = 0.5` trong `src/services/config.ts`.
