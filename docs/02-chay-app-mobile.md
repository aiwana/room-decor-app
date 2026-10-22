# Bước 2. Chạy app mobile (Expo) và nối với backend

Làm sau [Bước 1](./01-cai-dat-he-thong.md): backend Docker phải đang chạy và `curl.exe -s http://localhost:3001/health` trả `ok`.

Cần cài thêm:

| Phần mềm | Ghi chú |
| --- | --- |
| **Node.js 24 LTS** | React Native 0.86 cần Node ≥ 20.19.4 |
| **Android Studio** + một máy ảo Android (AVD) | Hoặc dùng điện thoại thật với Expo Go, xem mục 2 |

---

## 1. Cài thư viện

Đứng ở thư mục gốc `room-decor-app` (không phải trong `backend`):

```powershell
node -v
npm ci
```

`npm ci` cài đúng phiên bản ghi trong `package-lock.json` và không sửa `package.json`. Không dùng `npm install` hay `npm audit fix`, vì hai lệnh đó có thể đổi phiên bản thư viện.

Kết quả mong đợi: `node -v` ra `v24...` (hoặc ≥ `v20.19.4`), `npm ci` kết thúc không có `ERR!`. Các dòng `npm warn deprecated` là bình thường.

## 2. Tạo file `.env` ở gốc dự án

File này là cấu hình của **app**, khác với `backend\.env`. Nó đã nằm trong `.gitignore`.

```powershell
Copy-Item .env.example .env
notepad .env
```

Sửa thành hai dòng (chọn địa chỉ theo bảng bên dưới):

```dotenv
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
```

| App chạy ở đâu | Backend Docker (bước 1) | Backend `npm run dev` (bước 3) |
| --- | --- | --- |
| Android Emulator | `http://10.0.2.2:3001` | `http://10.0.2.2:3000` |
| Web trên cùng máy | `http://localhost:3001` | `http://localhost:3000` |
| Điện thoại thật (Expo Go) | Không gọi được (xem lưu ý) | `http://<IPv4 máy tính>:3000` |

Giải thích:

- `10.0.2.2` là địa chỉ để máy ảo Android gọi về máy Windows. Trong emulator, `localhost` là chính emulator.
- Backend Docker chỉ mở cổng cho `127.0.0.1`, nên **điện thoại thật không gọi tới được**. Muốn test trên điện thoại thật thì chạy backend bằng `npm run dev` (bước 3), lấy IPv4 Wi-Fi bằng `ipconfig`, điện thoại và máy tính cùng mạng, và cho phép cổng 3000 qua Windows Firewall.
- `EXPO_PUBLIC_USE_MOCK=true` cho app dùng dữ liệu giả, không cần backend. Dùng khi chỉ sửa giao diện.
- Mọi biến `EXPO_PUBLIC_*` đều bị đóng gói vào app. Không bao giờ đặt mật khẩu, `DATABASE_URL` hay `JWT_SECRET` ở đây.

## 3. Chạy app

Mở Android Emulator trước (Android Studio → Device Manager → ▶), rồi:

```powershell
npx expo start -c
```

Khi thấy mã QR, bấm `a` để mở app trên emulator. Cờ `-c` xoá cache; **mỗi lần sửa `.env` phải chạy lại với `-c`**, nếu không app có thể vẫn dùng giá trị cũ.

## 4. Kiểm tra app đã nối backend

1. Trong app: **Profile → Cài đặt & kết nối máy chủ → Kiểm tra kết nối**. Kết quả mong đợi: *Kết nối được backend*.
2. Đăng ký một tài khoản thử, vào **Catalog** thấy 18 sản phẩm.
3. AI Decor → chọn ảnh → Generate → Lưu → History có thiết kế vừa lưu.

Để thử chọn ảnh trên emulator: kéo-thả vài ảnh phòng từ máy tính vào cửa sổ emulator.

## 5. Kiểm tra code trước khi commit

Chạy `npx expo start` ít nhất một lần trước (nó tạo `.expo/types` cho các route), rồi:

```powershell
npm run typecheck
npm run lint
```

Kết quả mong đợi: cả hai không báo lỗi. Đây cũng là hai bước job Jenkins `room-decor-ci` chạy.

---

## Lỗi thường gặp

| Dấu hiệu | Cách xử lý |
| --- | --- |
| App vẫn hiện dữ liệu giả | Kiểm tra `.env` có `EXPO_PUBLIC_USE_MOCK=false`, rồi `npx expo start -c` |
| "Không kết nối được máy chủ" | Sai cổng (Docker là `3001`, dev là `3000`) hoặc backend chưa chạy: `curl.exe -s http://localhost:3001/health` |
| Typecheck báo `'/login' is not assignable to parameter of type ...` | Xoá thư mục `.expo`, chạy lại `npx expo start -c`, rồi typecheck lại |
| Đổi route/thư mục rồi gặp lỗi lạ | `npx expo start -c` |
| Emulator không mở khi bấm `a` | Mở emulator bằng Android Studio trước, rồi bấm `a` lại |
