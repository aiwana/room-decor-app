# Thiết lập PostgreSQL cho backend

Hướng dẫn này cấu hình PostgreSQL cho API trong `backend/`. Khi backend khởi động lần đầu, ứng dụng sẽ tự tạo bảng và thêm danh mục cùng dữ liệu sản phẩm mẫu. Không cần chạy migration thủ công.

## 1. Cài đặt hoặc tạo PostgreSQL

Bạn có thể dùng PostgreSQL cài trên máy hoặc dịch vụ PostgreSQL được quản lý. Hãy ghi lại:

- Host và port (mặc định `localhost:5432` nếu cài trên máy).
- Tên database.
- Tên người dùng và mật khẩu.
- Có cần kết nối SSL/TLS hay không.

Tạo một database riêng cho ứng dụng, ví dụ `room_decor`, cùng một tài khoản database riêng cho backend. Không dùng tài khoản quản trị `postgres` trong môi trường production.

Ví dụ chạy trong `psql` bằng tài khoản quản trị:

```sql
CREATE ROLE room_decor_app LOGIN PASSWORD 'replace-with-a-strong-password';
CREATE DATABASE room_decor OWNER room_decor_app;
```

Thay mật khẩu mẫu bằng một mật khẩu mạnh. Nếu database hoặc tài khoản đã tồn tại, không chạy lại các lệnh tạo tương ứng.

## 2. Cấu hình biến môi trường backend

Từ thư mục gốc của repository, tạo file riêng cho backend từ mẫu:

```powershell
Copy-Item backend\.env.example backend\.env
```

Mở `backend\.env` và cập nhật các giá trị:

```dotenv
PORT=3000
DATABASE_URL=postgresql://room_decor_app:YOUR_PASSWORD@localhost:5432/room_decor
JWT_SECRET=REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG
CORS_ORIGINS=http://localhost:8081,http://localhost:19006
UPLOAD_DIR=./storage/uploads
MAX_UPLOAD_BYTES=10485760
PGSSL=false
```

Thay `YOUR_PASSWORD` bằng mật khẩu tài khoản database. Nếu mật khẩu có ký tự đặc biệt như `@`, `:`, `/`, `#` hoặc `%`, hãy URL-encode mật khẩu trong `DATABASE_URL`.

Tạo `JWT_SECRET` ngẫu nhiên, riêng cho backend này và dài ít nhất 32 ký tự. Có thể tạo nhanh bằng Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Giữ nguyên giá trị được tạo trong `backend\.env`. Không commit file này, không chia sẻ secret, và tuyệt đối không đặt `DATABASE_URL` hoặc `JWT_SECRET` vào biến `EXPO_PUBLIC_*` của Expo.

### Database PostgreSQL được quản lý

Với nhà cung cấp cloud, dùng connection string và thông tin TLS do nhà cung cấp cấp:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
PGSSL=true
```

Đặt `PGSSL=true` nếu nhà cung cấp yêu cầu SSL. Nếu họ cung cấp chứng chỉ CA riêng, cần cấu hình chứng chỉ phù hợp với môi trường triển khai; không tắt xác minh chứng chỉ để lách lỗi TLS trong production.

## 3. Khởi động backend

Mở terminal tại thư mục gốc repository và chạy:

```powershell
Push-Location backend
npm install
npm run typecheck
npm run dev
```

Khi server chạy, nó kết nối PostgreSQL, tạo các bảng nếu chưa có, seed danh mục/sản phẩm mẫu theo cách có thể chạy lại an toàn, rồi lắng nghe trên `PORT` (mặc định `3000`). Lần khởi động đầu tiên cần truy cập được database.

Trong terminal khác, kiểm tra health endpoint:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Kết quả thành công:

```json
{
  "status": "ok",
  "message": "Room Decor AI backend is running"
}
```

Endpoint này truy vấn PostgreSQL; nếu database không kết nối được thì backend không báo sẵn sàng.

## 4. Kết nối ứng dụng Expo

Tạo hoặc cập nhật file `.env` ở thư mục gốc của repository (đây là file cấu hình Expo, khác với `backend\.env`):

```dotenv
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Chọn địa chỉ API theo nơi chạy app:

| Nơi chạy app | `EXPO_PUBLIC_API_URL` |
|---|---|
| Web trên máy chạy backend | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| iOS Simulator trên cùng máy | `http://localhost:3000` |
| Điện thoại thật | `http://<IPv4-LAN-của-máy-chạy-backend>:3000` |

Điện thoại thật và máy chạy backend phải cùng mạng; firewall của máy chủ cũng cần cho phép kết nối đến port đã cấu hình. Sau khi đổi `.env`, khởi động lại Expo để nạp cấu hình mới:

```powershell
npx expo start -c
```

Không đặt thông tin kết nối database hoặc JWT trong `.env` của Expo: mọi biến `EXPO_PUBLIC_*` được đưa vào ứng dụng client.

## 5. Lưu trữ ảnh thiết kế

Ảnh người dùng tải lên được ghi vào `UPLOAD_DIR` (mặc định `backend/storage/uploads/`), còn thông tin và đường dẫn ảnh được lưu trong PostgreSQL. Thư mục upload đã được thêm vào `.gitignore`; không xoá thư mục này nếu cần giữ ảnh thiết kế.

Khi triển khai nhiều backend instance, dùng storage dùng chung (chẳng hạn object storage) hoặc mount cùng một persistent volume cho mọi instance. Đặt `PUBLIC_BASE_URL` thành URL công khai của API nếu nó chạy sau reverse proxy, để liên kết ảnh trả về trỏ đúng host bên ngoài.

## 6. Khởi động production

Từ thư mục `backend/`, sau khi đã đặt các biến môi trường trên máy chủ:

```powershell
npm ci
npm run build
npm start
```

Đảm bảo quy trình production giữ `backend\.env` hoặc biến môi trường ngoài repository, giữ persistent storage cho ảnh, và sao lưu PostgreSQL theo chính sách vận hành của bạn. Không đưa file `.env` hoặc bản sao lưu chứa dữ liệu người dùng lên Git.

## Xử lý sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| Backend dừng ngay khi khởi động | `DATABASE_URL` và `JWT_SECRET` có trong `backend\.env` chưa; secret phải dài ít nhất 32 ký tự |
| Lỗi xác thực/kết nối PostgreSQL | Host, port, tên database, user/password, quyền kết nối và quy tắc mạng/firewall |
| Lỗi SSL từ dịch vụ cloud | Bật `PGSSL=true` và dùng cấu hình chứng chỉ mà nhà cung cấp hướng dẫn |
| `/health` không trả `status: ok` | Xem lỗi trong terminal backend và xác nhận database đang hoạt động, truy cập được |
| Điện thoại không kết nối được API | Dùng IPv4 LAN của máy chạy backend, cùng Wi-Fi, cho phép port qua firewall; không dùng `localhost` trên điện thoại |
| App vẫn dùng dữ liệu mẫu | Đặt `EXPO_PUBLIC_USE_MOCK=false`, kiểm tra `EXPO_PUBLIC_API_URL`, rồi chạy lại `npx expo start -c` |

Các endpoint và định dạng JSON được mô tả trong [API contract](./api-contract-de-xuat.md).
