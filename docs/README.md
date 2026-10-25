# RoomDecor: hướng dẫn cài đặt và chạy dự án

RoomDecor là app di động giúp người dùng chụp ảnh căn phòng, để AI dựng mặt bằng 2D, đặt thử nội thất và xem trước bằng 3D.

| Phần | Thư mục | Công nghệ |
|---|---|---|
| Backend (REST API) | `backend/` | Java 17, Spring Boot 3.4, Spring Security + JWT, Flyway |
| Cơ sở dữ liệu | `backend/docker-compose.yml` | PostgreSQL 16 chạy trong Docker |
| App di động | `mobile-app/` | React Native, Expo SDK 52, Expo Router, TypeScript |

## Đọc theo thứ tự

1. [01-cai-dat.md](01-cai-dat.md): cài phần mềm cần có (Git, JDK 17, Docker Desktop, Node.js, Android Studio).
2. [02-database.md](02-database.md): bật PostgreSQL bằng Docker Compose, Flyway, xem dữ liệu, xoá làm lại.
3. [03-chay-backend.md](03-chay-backend.md): tạo `backend/.env`, chạy backend, Swagger, chạy test, AI quét phòng.
4. [04-chay-mobile.md](04-chay-mobile.md): chạy app trên máy ảo Android hoặc điện thoại, chế độ mock và chế độ thật.

Tài liệu API:

- [api.md](api.md): danh sách toàn bộ API.
- [api-auth.md](api-auth.md): chi tiết đăng ký, đăng nhập, phân quyền USER/ADMIN, định dạng lỗi chung.

## Chạy nhanh (khi đã cài đủ phần mềm)

Mở 2 cửa sổ PowerShell.

**Cửa sổ 1: database + backend**

```powershell
cd room-decor-app\backend
Copy-Item .env.example .env      # lần đầu: mở .env, điền DB_PASSWORD và JWT_SECRET
docker compose up -d             # bật PostgreSQL (cổng 5433)
.\mvnw.cmd spring-boot:run       # backend ở http://localhost:8080
```

**Cửa sổ 2: app di động**

```powershell
cd room-decor-app\mobile-app
npm install                      # lần đầu
Copy-Item .env.example .env      # lần đầu: muốn gọi backend thật thì đặt EXPO_PUBLIC_USE_MOCK=false
npx expo start -c                # bấm "a" để mở máy ảo Android
```

## Các cổng đang dùng

| Cổng | Dịch vụ |
|---|---|
| `5433` | PostgreSQL (`127.0.0.1:5433` trên máy, `5432` bên trong container) |
| `8080` | Backend Spring Boot (`/api`, Swagger `/swagger-ui.html`, ảnh `/files`) |
| `8081` | Metro bundler của Expo |

Máy ảo Android gọi máy tính qua `10.0.2.2`, nên app dùng `http://10.0.2.2:8080/api`.

## Những điều không được làm

- **Không commit file `.env`** (`backend/.env`, `mobile-app/.env`): chứa mật khẩu và khóa bí mật. Chỉ commit `.env.example`.
- **Không sửa migration Flyway đã có** (`V1__...`, `V2__...`, `V3__...`). Muốn đổi bảng thì thêm file mới `V4__...`. Xem [02-database.md](02-database.md).
- **Không đặt khóa bí mật vào biến `EXPO_PUBLIC_*`** của app: mọi biến này đều bị đóng gói vào app.
