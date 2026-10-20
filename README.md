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
npm run typecheck       # kiểm tra TypeScript (chỉ frontend, không quét backend/)
npm run lint            # kiểm tra ESLint (chỉ frontend)
```

Backend nằm trong `backend/` và có `package.json`, `tsconfig.json` riêng:

```bash
cd backend
npm install
npm run dev             # http://localhost:3000/health
npm run typecheck
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
| `/login`, `/register` | Đăng nhập / đăng ký | Modal |
| `/settings` | Cài đặt: chế độ dữ liệu, địa chỉ API, kiểm tra kết nối | Stack |

## Cấu trúc thư mục

```
src/
  app/          Chỉ chứa route (Expo Router). Mỗi file chỉ re-export từ screens/
  screens/      Code thật của từng màn hình (index.tsx + styles.ts)
  components/   common/ home/ decor/ design/ catalog/
  constants/    colors.ts (màu, spacing), decorOptions.ts (loại phòng, phong cách, màu)
  context/      AuthContext (đăng nhập), DesignContext (danh sách thiết kế)
  hooks/        useAsync (tải dữ liệu), useRoomImagePicker (camera / thư viện)
  services/     Cổng duy nhất tới dữ liệu: apiClient, apiError, endpoints, authService,
                aiService, designService, productService, quoteService, healthService
  data/mock/    Toàn bộ dữ liệu giả
  types/        Type TypeScript
  utils/        format tiền, ngày...
```

## Mock → Backend / AI thật

Màn hình **không bao giờ** import thẳng `data/mock`. Mọi dữ liệu đi qua `src/services/`.
Mỗi service có 2 bản cùng 1 interface: `mockXxxService` và `apiXxxService`, chọn theo `USE_MOCK`.

- Đường dẫn API: chỉ ở `src/services/endpoints.ts`. Hiện backend **chỉ có** `GET /health`,
  các đường dẫn khác là **đề xuất** (xem `docs/api-contract-de-xuat.md`).
- Địa chỉ backend: chỉ ở `src/services/config.ts`, đổi bằng file `.env` (xem `.env.example`):

| Chạy app ở đâu | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android Emulator | `http://10.0.2.2:3000` (mặc định nếu bỏ trống) |
| Web trên cùng máy | `http://localhost:3000` (mặc định nếu bỏ trống) |
| Điện thoại thật (Expo Go) | `http://<IPv4 của máy tính>:3000`, lấy bằng `ipconfig`, cùng Wi-Fi |

- Kiểm tra kết nối: Profile → **Cài đặt & kết nối máy chủ** → *Kiểm tra kết nối*.
- Lỗi mạng/HTTP được đổi sang tiếng Việt ở `src/services/apiError.ts`.
- Token đăng nhập lưu bằng `expo-secure-store` (không dùng AsyncStorage, không lưu mật khẩu).

AI thật: chỉ cần sửa `apiAiService` trong `src/services/aiService.ts`. UI không phải sửa.
Thử màn hình lỗi của AI: đặt `MOCK_AI_FAIL_RATE = 0.5` trong `src/services/config.ts`.
