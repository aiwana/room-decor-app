# Tài liệu API: Tài khoản và bảo mật

Phần backend: đăng ký, đăng nhập, phân quyền USER/ADMIN, định dạng lỗi chung.
Backend Spring Boot chạy ở `http://localhost:8080` (máy ảo Android gọi qua `http://10.0.2.2:8080`).

Xem và gọi thử toàn bộ API trên trình duyệt: **http://localhost:8080/swagger-ui.html**
(bản mô tả máy đọc được, dạng OpenAPI JSON: `http://localhost:8080/v3/api-docs`).

## 1. Tóm tắt

| Phương thức | Đường dẫn | Cần token | Quyền | Mô tả |
|---|---|---|---|---|
| POST | `/api/auth/register` | Không | | Đăng ký tài khoản mới (luôn là USER) |
| POST | `/api/auth/login` | Không | | Đăng nhập, nhận JWT |
| GET | `/api/users/me` | Có | USER, ADMIN | Thông tin tài khoản đang đăng nhập |
| GET | `/api/admin/users` | Có | ADMIN | Danh sách tất cả tài khoản |

## 2. Xác thực bằng JWT

1. Gọi `register` hoặc `login`, lấy trường `token` trong kết quả.
2. Gửi token ở mọi API cần đăng nhập qua header:

   ```
   Authorization: Bearer <token>
   ```

3. Token hết hạn sau 24 giờ (cấu hình `JWT_EXPIRATION_MS`). Hết hạn thì API trả **401**, app cần đưa người dùng về màn hình đăng nhập.

Token chứa `sub` (id người dùng), `email`, `role`. App mobile **không cần** giải mã token: dùng trường `user.role` trong kết quả đăng nhập để ẩn/hiện chức năng admin.

Trong Swagger: gọi `login`, copy `token`, bấm nút **Authorize** (góc trên bên phải), dán token (không cần gõ chữ `Bearer`), rồi gọi các API có ổ khóa.

## 3. Chi tiết từng API

### 3.1 POST `/api/auth/register`

Body:

```json
{
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "password": "secret123"
}
```

| Trường | Ràng buộc |
|---|---|
| `name` | bắt buộc, tối đa 100 ký tự |
| `email` | bắt buộc, đúng định dạng email, chưa được đăng ký |
| `password` | bắt buộc, 6 đến 100 ký tự |

Thành công **200**:

```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOi...",
  "user": {
    "id": "e9d73dfc-a830-4152-a631-184d7bbf086c",
    "name": "Nguyen Van A",
    "email": "a@example.com",
    "role": "USER"
  }
}
```

Lỗi: **400** `Validation failed` (kèm `errors`), **400** `Email already registered`.
Gửi thêm `"role": "ADMIN"` trong body sẽ bị bỏ qua: tài khoản tự đăng ký luôn là USER.

### 3.2 POST `/api/auth/login`

Body:

```json
{
  "email": "a@example.com",
  "password": "secret123"
}
```

Thành công **200**: cùng dạng với `register` (`token` + `user`).

Lỗi: **400** `Validation failed`, **400** `Invalid email or password` (cố ý không nói rõ sai email hay sai mật khẩu, để kẻ xấu không dò được email nào đã đăng ký).

### 3.3 GET `/api/users/me`

Header: `Authorization: Bearer <token>`

Thành công **200**:

```json
{
  "id": "e9d73dfc-a830-4152-a631-184d7bbf086c",
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "role": "USER"
}
```

Lỗi: **401** thiếu, sai hoặc hết hạn token.

### 3.4 GET `/api/admin/users`

Header: `Authorization: Bearer <token của ADMIN>`

Thành công **200**: mảng tài khoản, xếp theo ngày tạo (không bao giờ có mật khẩu):

```json
[
  { "id": "f85e5a8a-...", "name": "Test User", "email": "test1@example.com", "role": "ADMIN" },
  { "id": "2a805341-...", "name": "Normal User", "email": "test2@example.com", "role": "USER" }
]
```

Lỗi: **401** thiếu/sai token, **403** đăng nhập bằng tài khoản USER.

## 4. Định dạng lỗi chung

Mọi lỗi của mọi API đều trả cùng một dạng JSON:

```json
{
  "timestamp": "2026-10-22T04:11:50.083Z",
  "status": 400,
  "message": "Validation failed",
  "errors": {
    "email": "must be a well-formed email address",
    "name": "must not be blank",
    "password": "size must be between 6 and 100"
  }
}
```

`errors` chỉ có khi lỗi validation (tên trường → lý do), để app hiện lỗi dưới từng ô nhập.

| Mã | Khi nào | `message` |
|---|---|---|
| 400 | Dữ liệu không hợp lệ | `Validation failed` (+ `errors`) |
| 400 | Body không phải JSON hợp lệ | `Malformed JSON request` |
| 400 | Tham số sai kiểu (ví dụ id không phải UUID) | `Invalid value for parameter '<tên>'` |
| 400 | Lỗi nghiệp vụ | ví dụ `Email already registered` |
| 401 | Thiếu, sai hoặc hết hạn token | `Authentication required: missing, invalid or expired token` |
| 403 | Đã đăng nhập nhưng không đủ quyền | `Access denied` |
| 404 | Không tìm thấy | `Resource not found` hoặc thông báo cụ thể |
| 405 | Sai phương thức HTTP | `Method <X> is not supported` |
| 500 | Lỗi máy chủ (chi tiết chỉ ghi trong log) | `Internal server error` |

Gợi ý cho app mobile: **401** thì xóa token đã lưu và chuyển về màn hình đăng nhập; **403** thì báo "Bạn không có quyền".

## 5. Phân quyền

- Có 2 role: `USER` (mặc định) và `ADMIN`, lưu ở cột `users.role` (Flyway `V2__add_user_role.sql`).
- Mọi đường dẫn `/api/admin/**` chỉ ADMIN gọi được (cấu hình trong `SecurityConfig`).
- Với API admin nằm ở chỗ khác (ví dụ thêm nội thất), gắn annotation lên method hoặc controller:

  ```java
  @PreAuthorize("hasRole('ADMIN')")
  ```

- Lấy id người dùng đang đăng nhập trong controller: `UUID userId = (UUID) auth.getPrincipal();`

### Tạo tài khoản ADMIN

Không có API để tự lên ADMIN (cố ý, để không ai tự cấp quyền). Cách làm:

1. Đăng ký tài khoản bình thường qua `/api/auth/register`.
2. Nâng quyền trong database:

   ```powershell
   # Database started with docker compose (run from the backend folder)
   docker compose exec postgres psql -U roomdecor_app -d roomdecor -c "UPDATE users SET role='ADMIN' WHERE email='admin@example.com';"

   # Old room-decor-postgres container
   docker exec room-decor-postgres psql -U roomdecor_app -d roomdecor -c "UPDATE users SET role='ADMIN' WHERE email='admin@example.com';"
   ```

3. **Đăng nhập lại** để nhận token mới có role ADMIN (role nằm trong token, token cũ vẫn là USER cho đến khi hết hạn).

## 6. Cấu hình backend (biến môi trường)

Đặt trong file `backend/.env` (không commit, xem `backend/.env.example`) hoặc biến môi trường thật (Docker, Jenkins).

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `DB_URL` | Không | `jdbc:postgresql://localhost:5433/roomdecor` | Địa chỉ database |
| `DB_USERNAME` | Không | `roomdecor_app` | User database |
| `DB_PASSWORD` | **Có** | | Mật khẩu database |
| `JWT_SECRET` | **Có** | | Khóa ký token, ít nhất 32 ký tự, ngẫu nhiên |
| `JWT_EXPIRATION_MS` | Không | `86400000` (24 giờ) | Thời hạn token |
| `UPLOAD_DIR` | Không | `./uploads` | Thư mục lưu ảnh upload |
| `STORAGE_BASE_URL` | Không | `http://localhost:8080/files` | URL gốc trả về cho ảnh |

Thiếu `DB_PASSWORD` hoặc `JWT_SECRET` thì app dừng ngay khi khởi động và báo lỗi, để không chạy nhầm với khóa yếu.
