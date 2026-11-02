# 06. Đóng gói: Docker, Jenkins, APK

Tài liệu này hướng dẫn 3 việc: chạy backend bằng Docker, cho Jenkins tự kiểm tra nhánh `master`, và build file APK cho Android.
Mọi lệnh đều chạy trong **PowerShell**.

## 1. Backend trong Docker

### File mới trong `backend/`

| File | Dùng để làm gì |
|---|---|
| `Dockerfile` | Build qua 2 tầng: tầng đầu dùng Maven để tạo file `.jar`, tầng sau chỉ giữ JRE 17 + file `.jar` (không có mã nguồn, không có `.env`), chạy bằng user thường `app` |
| `.dockerignore` | Không chép `.env`, `target/`, `uploads/` vào image |
| `docker-compose.yml` | Chạy **PostgreSQL + backend** cho máy chưa có database (container `roomdecor-db` và `roomdecor-api`) |
| `docker-compose.existing-db.yml` | Chỉ chạy **backend**, dùng container `room-decor-postgres` đã có sẵn (máy của Khanh) |

Backend có thêm `GET /actuator/health`, trả `{"status":"UP"}` (không cần token, không lộ thông tin gì khác). Docker và Jenkins dùng đường dẫn này để biết backend còn sống hay không.

### Cách A: máy đã có `room-decor-postgres` (máy Khanh)

Database `roomdecor` đã chạy tới V8 nên Flyway chỉ báo "Schema is up to date". Dữ liệu được giữ nguyên.

```powershell
cd room-decor-app-springboot\backend
# Kiểm tra: room-decor-postgres phải nằm trong network room-decor-net
docker network inspect room-decor-net --format "{{range .Containers}}{{.Name}} {{end}}"
# Nếu không thấy room-decor-postgres:  docker network connect room-decor-net room-decor-postgres

# Tắt backend đang chạy bằng mvnw (Ctrl+C) vì cả hai cùng dùng cổng 8080
docker compose -f docker-compose.existing-db.yml up -d --build
docker compose -f docker-compose.existing-db.yml ps          # chờ tới khi thấy (healthy)
curl.exe http://localhost:8080/actuator/health               # {"status":"UP"}
docker compose -f docker-compose.existing-db.yml logs -f backend
```

Lần build đầu mất khoảng 2 đến 5 phút vì Maven phải tải thư viện. Những lần sau nhanh hơn nhờ cache.

### Cách B: máy mới (các bạn trong nhóm)

```powershell
cd room-decor-app\backend
Copy-Item .env.example .env      # điền DB_PASSWORD, JWT_SECRET (>= 32 ký tự)
docker compose up -d --build     # bật cả PostgreSQL và backend
docker compose ps                # roomdecor-db và roomdecor-api đều (healthy)
```

### Lệnh hay dùng

| Việc | Lệnh (thêm `-f docker-compose.existing-db.yml` nếu dùng cách A) |
|---|---|
| Xem log | `docker compose logs -f backend` |
| Build lại sau khi sửa code | `docker compose up -d --build backend` |
| Dừng | `docker compose stop` |
| Xoá container (giữ dữ liệu) | `docker compose down` |
| **Xoá luôn dữ liệu DB** (cẩn thận!) | `docker compose down -v` (chỉ dùng cho cách B) |

### Ghi chú

- Backend đọc cấu hình từ `backend/.env`. Riêng `DB_URL` và `UPLOAD_DIR` được file compose ghi đè cho đúng với môi trường Docker.
- Ảnh phòng lưu ở `backend/uploads` trên máy (mount vào `/app/uploads`), nên ảnh đã tải lên lúc chạy bằng mvnw vẫn xem được.
- Cổng 8080 mở ra mạng Wi-Fi để điện thoại kết nối được. Khi đổi mạng thì sửa `STORAGE_BASE_URL` trong `.env` rồi chạy `docker compose ... up -d` để container nhận giá trị mới.
- Mật khẩu và khoá API **không bao giờ** nằm trong image. Chúng chỉ được truyền vào lúc chạy container.

## 2. Jenkins cho nhánh master

Script: `cicd/jenkins-roomdecor-springboot-ci.groovy` (trong thư mục chung của dự án). Nên tạo **job mới** `roomdecor-springboot-ci` (Pipeline script), còn job cũ `room-decor-ci` (nhánh backend-db) thì để nguyên.

Các bước của pipeline:

1. Checkout `master`.
2. `mvn -B verify` trong thư mục backend: chạy 70 unit test cùng test bảo mật, sinh báo cáo coverage JaCoCo.
3. Mobile: `npm ci`, `typecheck`, `lint`.
4. SonarQube cho 2 project mới `roomdecor-springboot-backend` và `roomdecor-springboot-mobile`, kèm Quality Gate.
5. Build image `roomdecor-backend:ci-<số build>`, rồi kiểm tra image chạy bằng user `app`, không có `.env`.
6. Smoke test: chạy image vừa build cùng một Postgres tạm trong network riêng. Flyway phải chạy đủ V1–V8 và health phải là `healthy`. Chạy xong thì xoá container, network và image của build đó.

Pipeline không deploy gì và không đụng vào `room-decor-postgres`, `room-decor-backend` hay `cicd-portal`.
Pipeline cần các tool đã cài sẵn trong Jenkins: `jdk21`, `maven3`, `node20`, `sonar-scanner`, cùng server SonarQube tên `SonarQube`.

## 3. Build APK

File `mobile-app/eas.json` có 2 profile, cả hai đều ra file `.apk` và gọi backend thật (`EXPO_PUBLIC_USE_MOCK=false`):

| Profile | Backend | Dùng khi |
|---|---|---|
| `preview` | `http://172.17.144.106:8080/api` (IP máy Khanh ở trường) | Demo trên lớp, điện thoại cùng Wi-Fi với máy chạy backend |
| `production` | Địa chỉ HTTPS công khai (cần điền) | Phát hành qua GitHub Releases cho người ngoài cài |

Đổi IP hay địa chỉ backend thì sửa `EXPO_PUBLIC_API_URL` trong `eas.json` rồi build lại. Giá trị này được đóng cứng vào APK.

### Bước bắt buộc trước khi build `preview` (backend dùng http)

Bản APK release của Android **chặn http** theo mặc định. Vì vậy cần bật cho phép:

```powershell
cd mobile-app
npx expo install expo-build-properties
```

Sau đó thêm vào mảng `plugins` trong `app.json`:

```json
["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
```

Nếu backend đã có HTTPS (profile `production`) thì không cần bước này.

### Build bằng EAS (máy chủ của Expo, không cần Android SDK)

```powershell
npm install -g eas-cli
eas login                          # tài khoản expo.dev (miễn phí)
cd mobile-app
eas build -p android --profile preview
```

Build xong, EAS đưa link tải file `.apk`. Chép file đó vào điện thoại để cài, hoặc đính kèm vào GitHub Releases.

### Phát hành qua GitHub Releases

Người tải APK không ở chung Wi-Fi với máy chạy backend, nên backend phải có địa chỉ **HTTPS công khai** (ví dụ tunnel có tên miền cố định như ngrok hoặc Cloudflare Tunnel, hoặc thuê VPS chạy `docker compose`). Có địa chỉ rồi thì điền vào profile `production`, build `--profile production`, rồi tạo Release trên GitHub và đính kèm file `.apk`.
