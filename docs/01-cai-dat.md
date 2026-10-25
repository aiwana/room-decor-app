# 1. Cài đặt phần mềm

Hướng dẫn cho Windows 10/11 (PowerShell). Mỗi phần mềm chỉ cần cài một lần.

| Phần mềm | Phiên bản | Dùng cho | Kiểm tra |
|---|---|---|---|
| Git | mới nhất | lấy code | `git --version` |
| JDK | **17 trở lên** (17 hoặc 21 đều được) | chạy backend | `java -version` |
| Docker Desktop | mới nhất | chạy PostgreSQL | `docker --version`, `docker compose version` |
| Node.js | **20 LTS hoặc 22 LTS** | chạy app di động | `node -v`, `npm -v` |
| Android Studio | mới nhất | máy ảo Android | mở Device Manager thấy máy ảo |

Không cần cài Maven: backend có sẵn **Maven Wrapper** (`backend\mvnw.cmd`), lần chạy đầu tự tải Maven 3.9.9.

## Git

Tải ở https://git-scm.com/download/win, cài với tùy chọn mặc định. Sau đó lấy code:

```powershell
git clone https://github.com/aiwana/room-decor-app.git
cd room-decor-app
git switch Spring_boot
```

## JDK 17

Tải **Eclipse Temurin 17** (hoặc 21) ở https://adoptium.net. Khi cài, tick **Set JAVA_HOME variable** và **Add to PATH**.
Mở **cửa sổ PowerShell mới** rồi kiểm tra:

```powershell
java -version        # phải thấy 17.x hoặc 21.x
echo $env:JAVA_HOME  # phải có đường dẫn tới thư mục JDK
```

Dự án biên dịch theo chuẩn Java 17 (`backend/pom.xml`), nên máy có JDK 21 vẫn chạy bình thường.

## Docker Desktop

Tải ở https://www.docker.com/products/docker-desktop, cài với **WSL 2** (mặc định), khởi động lại máy nếu được hỏi.
Mở Docker Desktop, đợi chữ **Engine running**, rồi kiểm tra:

```powershell
docker --version
docker compose version
docker run --rm hello-world   # in ra "Hello from Docker!" là được
```

## Node.js

Tải bản **LTS** ở https://nodejs.org (20 hoặc 22). Kiểm tra:

```powershell
node -v
npm -v
```

Nếu PowerShell báo lỗi "running scripts is disabled" khi chạy `npm`/`npx`, chạy một lần:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Android Studio (máy ảo Android)

1. Tải ở https://developer.android.com/studio, cài mặc định.
2. Mở Android Studio → **More Actions → Virtual Device Manager → Create device** → chọn Pixel bất kỳ → chọn ảnh hệ thống có **Play Store**, API 34 → Finish.
3. Bấm ▶ để bật máy ảo. Khi chạy app, Expo tự cài Expo Go đúng phiên bản vào máy ảo.

Dùng điện thoại thật thay máy ảo: xem [04-chay-mobile.md](04-chay-mobile.md#chạy-trên-điện-thoại-thật).

## Công cụ nên có (không bắt buộc)

- **VS Code** để sửa code (extension: Java Extension Pack, ESLint).
- **DBeaver** hoặc **pgAdmin** để xem database (kết nối xem [02-database.md](02-database.md#xem-dữ-liệu)).
