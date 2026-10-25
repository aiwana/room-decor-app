# 4. Chạy app di động (Expo)

Mọi lệnh chạy trong thư mục **`mobile-app`**.

## 1. Cài thư viện (lần đầu, hoặc khi `package.json` thay đổi)

```powershell
cd mobile-app
npm install
```

## 2. Tạo file `.env` của app

```powershell
Copy-Item .env.example .env
notepad .env
```

| Biến | Giá trị | Ý nghĩa |
|---|---|---|
| `EXPO_PUBLIC_USE_MOCK` | `true` (mặc định) | Dữ liệu giả ngay trong app, **không cần backend**. Đăng nhập bằng email bất kỳ. Hợp để làm giao diện. |
| | `false` | Gọi backend Spring Boot thật (cần chạy backend trước, xem [03-chay-backend.md](03-chay-backend.md)). |
| `EXPO_PUBLIC_API_URL` | xem bảng dưới | Địa chỉ backend, **có `/api` ở cuối**. |

| Chạy app trên | `EXPO_PUBLIC_API_URL` |
|---|---|
| Máy ảo Android | `http://10.0.2.2:8080/api` (10.0.2.2 là máy tính, nhìn từ máy ảo) |
| Điện thoại thật (cùng Wi-Fi) | `http://<IP máy tính>:8080/api`, ví dụ `http://192.168.1.10:8080/api` |
| iOS Simulator (macOS) | `http://localhost:8080/api` |

Sửa `.env` xong **phải chạy lại với `-c`** (xoá cache) thì app mới nhận giá trị mới.
Biến `EXPO_PUBLIC_*` bị đóng gói vào app: **không đặt mật khẩu hay khóa bí mật** vào đây.

## 3. Chạy app

```powershell
npx expo start -c
```

- **Máy ảo Android:** bật máy ảo trong Android Studio, rồi bấm phím `a` ở cửa sổ Expo. Lần đầu Expo tự cài Expo Go vào máy ảo.
- Bấm `r` để tải lại app, `Ctrl+C` để dừng.

### Chạy trên điện thoại thật

1. Điện thoại và máy tính **cùng mạng Wi-Fi**.
2. Lấy IP máy tính: `ipconfig` → dòng **IPv4 Address** của card Wi-Fi.
3. Đặt `EXPO_PUBLIC_API_URL=http://<IP đó>:8080/api` trong `mobile-app/.env`, chạy lại `npx expo start -c`.
4. Mở **Expo Go** trên điện thoại, quét mã QR trong cửa sổ Expo.
5. Lần đầu Windows hỏi tường lửa cho Java/Node: chọn **Allow** (mạng Private), nếu không điện thoại không gọi được cổng 8080 và 8081.

App dùng **Expo SDK 52**. Expo Go mới nhất trên cửa hàng có thể chỉ hỗ trợ SDK mới hơn và báo "incompatible". Khi đó dùng máy ảo Android (Expo tự cài đúng bản), hoặc cài Expo Go bản cho SDK 52 từ https://expo.dev/go.

### Kiểm tra app có gọi được backend không

Trong app: **Hồ sơ → Cài đặt → Kiểm tra kết nối**. Báo "Kết nối được máy chủ" là địa chỉ đúng và backend đang chạy.

## 4. Luồng chức năng để thử

1. **Đăng ký / Đăng nhập** (`POST /api/auth/register`, `/login`).
2. Tab **Thiết kế mới**: chụp hoặc chọn ảnh phòng → đặt tên → **Tạo thiết kế**.
   App upload ảnh, tạo thiết kế, rồi gọi AI quét phòng (`POST /api/ai/scan-room`) để dựng mặt bằng.
3. **Trình chỉnh sửa** có 3 chế độ xem:
   - **Ảnh phòng**: bấm **Thêm đồ**, kéo để di chuyển, 2 ngón để phóng to và xoay.
   - **Mặt bằng 2D**: nhìn từ trên xuống, tường do AI quét, nội thất vẽ đúng kích thước thật. Nút **Quét lại** để quét lại ảnh.
   - **3D**: xem phòng 3D (Three.js), kéo để xoay góc nhìn. **Cần Internet** vì Three.js được tải từ CDN.
   Cả 3 chế độ dùng chung một bộ vị trí nội thất.
4. **Lưu**: lưu trên máy và gửi lên máy chủ (`PUT /api/designs/{id}`).
5. Tab **Của tôi**: danh sách thiết kế, mở lại hoặc xoá.

Ghi chú:

- Bảng `furniture` trên backend đang trống, nên app dùng **nội thất mẫu** (id bắt đầu bằng `sample-`). Các món mẫu chỉ lưu trên máy, không gửi lên máy chủ.
- Backend chưa có `OPENAI_API_KEY` thì mặt bằng là phòng mẫu 4m x 4m.
- **AI gợi ý** bố trí: backend chưa có AI thật, app hiện gợi ý mẫu và ghi rõ là mẫu.

## 5. Kiểm tra code trước khi commit

```powershell
npm run typecheck   # TypeScript
npm run lint        # ESLint
```

Cấu trúc thư mục và danh sách màn hình: [mobile-app/README.md](../mobile-app/README.md).

## Lỗi thường gặp

| Lỗi | Cách sửa |
|---|---|
| "Không kết nối được máy chủ" / `Network Error` | Backend chưa chạy, sai `EXPO_PUBLIC_API_URL` (thiếu `/api`, dùng `localhost` trên máy ảo Android), hoặc chưa chạy lại `npx expo start -c` sau khi sửa `.env`. Điện thoại thật: kiểm tra cùng Wi-Fi và tường lửa. |
| Sửa `.env` mà app không đổi | Chạy lại `npx expo start -c`. |
| Đăng nhập xong vẫn bị đẩy về màn đăng nhập | Token hết hạn hoặc `JWT_SECRET` của backend đã đổi. Đăng nhập lại. |
| Màn 3D báo "Không tải được 3D" | Máy ảo/điện thoại không có Internet (cần tải Three.js từ cdn.jsdelivr.net). |
| `npm install` lỗi `ERESOLVE` | Dùng Node 20/22 LTS. Xoá `node_modules` rồi `npm install` lại. |
| Expo Go báo "Project is incompatible" | Xem mục [Chạy trên điện thoại thật](#chạy-trên-điện-thoại-thật) về Expo Go cho SDK 52. |
