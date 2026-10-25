# 3. Chạy backend (Spring Boot)

Mọi lệnh dưới đây chạy trong thư mục **`backend`** (Spring Boot đọc `.env` ở thư mục đang đứng).

## 1. Tạo file `.env`

```powershell
cd backend
Copy-Item .env.example .env
notepad .env
```

Điền các giá trị, **không để dấu nháy**:

| Biến | Bắt buộc | Điền gì |
|---|---|---|
| `DB_URL` | Không | Giữ `jdbc:postgresql://localhost:5433/roomdecor` |
| `DB_USERNAME` | Không | Giữ `roomdecor_app` |
| `DB_PASSWORD` | **Có** | Máy mới: tự đặt một mật khẩu bất kỳ (compose sẽ tạo database với mật khẩu này). Máy dùng container cũ: mật khẩu của container đó. |
| `JWT_SECRET` | **Có** | Chuỗi ngẫu nhiên, ít nhất 32 ký tự (lệnh tạo ở dưới) |
| `JWT_EXPIRATION_MS` | Không | Thời hạn token, mặc định 24 giờ |
| `UPLOAD_DIR` | Không | Thư mục lưu ảnh upload, mặc định `./uploads` |
| `STORAGE_BASE_URL` | Không | URL gốc của ảnh trả về cho app, mặc định `http://localhost:8080/files` |
| `OPENAI_API_KEY` | Không | Để trống: AI quét phòng trả về phòng mẫu 4m x 4m. Có khóa: dùng GPT-4o Vision. |
| `OPENAI_MODEL` | Không | Mặc định `gpt-4o` |

Tạo `JWT_SECRET` ngẫu nhiên trong PowerShell:

```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

Thiếu `DB_PASSWORD` hoặc `JWT_SECRET` thì backend dừng ngay khi khởi động (cố ý, để không chạy với khóa yếu).
`.env` đã nằm trong `.gitignore`, **không commit file này**.

## 2. Bật database

```powershell
docker compose up -d
```

Chi tiết và lỗi thường gặp: [02-database.md](02-database.md).

## 3. Chạy backend

```powershell
.\mvnw.cmd spring-boot:run
```

- Lần đầu tải Maven và thư viện (vài phút). Thấy dòng `Started RoomDecorApplication` là xong.
- Lần đầu Flyway tạo bảng: log có `Successfully applied 3 migrations`.
- Log có `AI room scan: OPENAI_API_KEY not set, using MockVisionClient` nghĩa là AI quét phòng đang dùng phòng mẫu.
- Dừng backend: `Ctrl+C`.

Xem log SQL và bảo mật chi tiết (profile `dev`):

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

## 4. Thử API bằng Swagger

Mở http://localhost:8080/swagger-ui.html

1. `POST /api/auth/register` → **Try it out** → điền tên, email, mật khẩu (từ 6 ký tự) → **Execute**.
2. Copy giá trị `token` trong kết quả.
3. Bấm **Authorize** (góc trên phải), dán token (không cần gõ `Bearer`), **Authorize**.
4. Gọi các API có ổ khóa, ví dụ `GET /api/users/me`.

Danh sách API: [api.md](api.md). Chi tiết đăng nhập, phân quyền, mã lỗi: [api-auth.md](api-auth.md).

## 5. Chạy test

```powershell
.\mvnw.cmd test
```

Có 15 unit test (JUnit 5 + Mockito) cho `AuthService`, `UserService`, `JwtTokenProvider`. Test không cần database.
Kết quả chi tiết nằm trong `target/surefire-reports/`.

## 6. AI quét phòng ra mặt bằng 2D

`POST /api/ai/scan-room` nhận `roomImageId` của ảnh đã upload, tạo bảng ghi `floor_plans` (kích thước phòng theo mét, danh sách tường).

- **Không có `OPENAI_API_KEY`** (mặc định): `MockVisionClient` trả về phòng hình chữ nhật 4m x 4m, trần 2,7m. Đủ để làm và test giao diện.
- **Có `OPENAI_API_KEY`**: `OpenAiVisionClient` gửi **URL ảnh** cho GPT-4o. OpenAI phải tải được ảnh qua Internet, nên `STORAGE_BASE_URL` phải là địa chỉ công khai. Với `http://localhost:8080/files` (chạy trên máy cá nhân), OpenAI không tải được ảnh và API trả lỗi 400.
- Muốn đổi sang nhà cung cấp khác (Gemini...): viết class mới `implements RoomVisionClient` và chọn nó trong `config/AiConfig.java`.

## Cấu trúc code

```
backend/src/main/java/com/roomdecor/
  config/       SecurityConfig, OpenApiConfig, StorageConfig, AiConfig
  controller/   Auth, User, Admin, Furniture, Design, RoomImage, Ai, FloorPlan, File
  dto/          Dữ liệu vào/ra của API (record)
  entity/       Bảng database (JPA)
  exception/    GlobalExceptionHandler, ErrorResponse, các exception riêng
  mapper/       Đổi entity <-> DTO
  repository/   Spring Data JPA
  security/     JWT: tạo/kiểm tra token, filter, trả lỗi 401/403 dạng JSON
  service/      Nghiệp vụ; service/ai/ là các client AI quét phòng
backend/src/main/resources/
  application.yml        Cấu hình chung (đọc .env)
  application-dev.yml    Log chi tiết cho profile dev
  db/migration/          Flyway V1, V2, V3
```

## Lỗi thường gặp

| Lỗi | Cách sửa |
|---|---|
| `The term '.\mvnw.cmd' is not recognized` | Đang đứng sai thư mục. `cd backend` rồi chạy lại. |
| `JAVA_HOME not found` / `java` không nhận | Cài JDK 17 và tick **Set JAVA_HOME**, mở PowerShell mới. Xem [01-cai-dat.md](01-cai-dat.md#jdk-17). |
| `Could not resolve placeholder 'DB_PASSWORD'` hoặc `'JWT_SECRET'` | Chưa có `backend/.env`, hoặc chạy lệnh ngoài thư mục `backend`, hoặc để trống giá trị. |
| `release version 17 not supported` | Máy đang dùng JDK cũ hơn 17. Cài JDK 17+ và sửa `JAVA_HOME`. |
| `Port 8080 was already in use` | Có backend khác đang chạy. Tắt cửa sổ cũ, hoặc `netstat -ano \| findstr :8080` rồi `taskkill /PID <số> /F`. |
| `password authentication failed` / `Connection refused` | Xem [02-database.md](02-database.md#lỗi-thường-gặp). |
| `Schema-validation: missing table` | Database thiếu bảng do Flyway chưa chạy hết. Xem log Flyway; máy cá nhân có thể `docker compose down -v` rồi chạy lại. |
