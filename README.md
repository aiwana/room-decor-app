# Room Decor AI

Ứng dụng mobile giúp người dùng **thiết kế / trang trí phòng bằng AI**:
chụp hoặc chọn ảnh phòng → chọn loại phòng, phong cách, màu → AI thiết kế lại → lưu → xem lịch sử.
Module phụ **Catalog vật liệu** cho phép xem sản phẩm được dùng trong thiết kế và gửi yêu cầu báo giá.

Expo SDK 57 · React Native 0.86 · Expo Router · TypeScript strict.
Backend Express + PostgreSQL đã chạy thật (nhánh `backend-db`); đã tích hợp tác vụ AI bất đồng bộ qua Pollinations. Mặc định app vẫn dùng dữ liệu giả cho đến khi đặt `EXPO_PUBLIC_USE_MOCK=false`.

**Thành viên mới:** cài đặt theo thứ tự trong [docs/README.md](./docs/README.md).

## Chạy dự án

```bash
npm install
npx expo start          # nhấn "a" để mở Android Emulator, hoặc quét QR bằng Expo Go
npm run typecheck       # kiểm tra TypeScript (chỉ frontend, không quét backend/)
npm run lint            # kiểm tra ESLint (chỉ frontend)
```

Backend nằm trong `backend/` và có `package.json`, `tsconfig.json` riêng. Backend dùng PostgreSQL.
Cách dựng PostgreSQL + backend (Docker hoặc `npm run dev`): xem [docs/README.md](./docs/README.md).

Đặt `EXPO_PUBLIC_USE_MOCK=false` trong file `.env` tại gốc dự án để app gọi API thật.
Đặt `EXPO_PUBLIC_API_URL` theo địa chỉ backend đang chạy (xem `.env.example`); khi dùng điện thoại thật,
địa chỉ phải là IPv4 LAN của máy chạy backend và hai thiết bị phải cùng mạng. Không đưa `DATABASE_URL` hay
`JWT_SECRET` vào biến `EXPO_PUBLIC_*`.

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

- Đường dẫn API: chỉ ở `src/services/endpoints.ts`. Danh sách endpoint backend: [docs/api-contract.md](./docs/api-contract.md).
- Địa chỉ backend: chỉ ở `src/services/config.ts`, đổi bằng file `.env` (xem `.env.example`):

| Chạy app ở đâu | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android Emulator | `http://10.0.2.2:3000` (mặc định nếu bỏ trống). Backend chạy bằng Docker thì dùng cổng `3001` |
| Web trên cùng máy | `http://localhost:3000` (mặc định nếu bỏ trống) |
| Điện thoại thật (Expo Go) | `http://<IPv4 của máy tính>:3000`, lấy bằng `ipconfig`, cùng Wi-Fi |

- Kiểm tra kết nối: Profile → **Cài đặt & kết nối máy chủ** → *Kiểm tra kết nối*.
- Lỗi mạng/HTTP được đổi sang tiếng Việt ở `src/services/apiError.ts`.
- Token đăng nhập lưu bằng `expo-secure-store` (không dùng AsyncStorage, không lưu mật khẩu).

AI thật: `src/services/aiService.ts` gửi ảnh và lựa chọn lên `POST /api/designs`, nhận trạng thái `processing`, rồi polling đến `done` hoặc `failed`. Backend gọi provider trong `backend/src/ai/`.
Thử màn hình lỗi của AI: đặt `MOCK_AI_FAIL_RATE = 0.5` trong `src/services/config.ts`.

## Phạm vi AI và kiểm tra trước khi demo

Provider hiện tại tạo ảnh từ mô tả (text-to-image). Ảnh phòng tải lên được lưu để đối chiếu trước/sau; chưa được đưa vào mô hình để giữ bố cục phòng gốc. Vì vậy, kết quả là gợi ý nội thất theo phong cách, chưa phải bản cải tạo chính xác của căn phòng. Muốn giữ bố cục cần bổ sung provider image-to-image.

Backend kiểm tra chữ ký JPEG/PNG/WebP và Content-Type trước khi lưu ảnh AI; phản hồi HTML/JSON hoặc ảnh quá ngắn sẽ báo lỗi. Lỗi mạng, lỗi tải dữ liệu và HTTP 504 được xử lý theo cơ chế retry hiện có.

Chạy kiểm thử từ thư mục `backend/`:

```bash
npm ci
npm run typecheck
npm test -- --runTestsByPath src/__tests__/ai-provider.test.ts
npm test
```

Kiểm thử provider giả lập phản hồi HTTP, không gọi dịch vụ AI và không tốn phí. Chúng kiểm tra định dạng dữ liệu và xử lý lỗi, không kiểm chứng chất lượng ảnh hay khả năng sẵn sàng của dịch vụ thực tế.

Khi demo: đăng nhập → chọn ảnh phòng → chọn phong cách → tạo thiết kế → kiểm tra trạng thái chờ → xem kết quả → lưu vào lịch sử. Nếu dịch vụ bận, chờ cơ chế retry hoặc xem thông báo lỗi. Xem thêm [tài liệu tích hợp AI](docs/tich-hop-ai.md).
