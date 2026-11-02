# 08. Ghi nhớ vận hành: bật máy, demo, xử lý lỗi

Cập nhật: 02/11/2026, áp dụng cho master từ `f7a1bfe` trở đi.

## 1. Thứ tự bật trước khi dùng app (APK)

App trên điện thoại gọi tới backend nằm trên laptop của Tân, qua địa chỉ
`https://cytoplast-junction-washed.ngrok-free.dev`. **Laptop tắt thì app không dùng được.**

1. **Bật laptop, mở Docker Desktop** và chờ chữ *Engine running* (khoảng 1 phút). Mọi thứ đều chạy trong Docker.
2. **Kiểm tra các container** (thường tự chạy lại vì có `restart: unless-stopped`):
   ```powershell
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```
   Phải thấy các container sau ở trạng thái `Up`:

   | Container | Vai trò | Bắt buộc cho app? |
   |---|---|---|
   | `room-decor-postgres` | Database `roomdecor` của app | **Có** |
   | `roomdecor-api` | Backend Spring Boot (cổng 8080) | **Có** (phải `healthy`) |
   | `roomdecor-tunnel` | ngrok, mở backend ra Internet | **Có** (cho APK) |
   | `portal-jenkins`, `portal-sonarqube`, `portal-sonar-db` | CI/CD | Không (chỉ khi build/demo CI) |
   | `roomdecor-prometheus`, `roomdecor-grafana` | Giám sát | Không (chỉ khi demo giám sát) |
   | `room-decor-backend` | Backend Node.js **cũ** | Không, kệ nó |

3. **Thiếu container nào thì bật lại:**
   ```powershell
   docker start room-decor-postgres
   cd C:\Users\TANBINHGAS\Desktop\room-decor-app-springboot\backend
   docker compose -f docker-compose.existing-db.yml --profile public up -d
   ```
   Bật database **trước**, backend sau. Lệnh `up -d` chạy bao nhiêu lần cũng an toàn.
4. **Kiểm tra từ Internet** (bước quan trọng nhất trước khi demo):
   ```powershell
   curl.exe https://cytoplast-junction-washed.ngrok-free.dev/actuator/health
   ```
   Ra `{"status":"UP"}` là điện thoại ở bất kỳ mạng nào (4G, Wi-Fi khác) cũng dùng được app.
5. **Mở app RoomDecor trên điện thoại.** Không cần Expo Go, không cần `npx expo start`.

## 2. Địa chỉ cần nhớ

| Thứ | Địa chỉ | Ghi chú |
|---|---|---|
| Backend công khai | `https://cytoplast-junction-washed.ngrok-free.dev` | App APK dùng địa chỉ này |
| Backend trên máy | `http://localhost:8080` | Swagger: `/swagger-ui.html`, health: `/actuator/health` |
| Database app | `127.0.0.1:5433`, db `roomdecor`, user `roomdecor_app` | Container `room-decor-postgres` |
| Jenkins | `http://localhost:8089` | Job `roomdecor-springboot-ci` (Jenkinsfile trong repo) |
| SonarQube | `http://localhost:9001` | Project `roomdecor-springboot-backend`, `roomdecor-springboot-mobile` |
| Prometheus | `http://localhost:9090` | |
| Grafana | `http://localhost:3030` | |
| Trang build APK | expo.dev, tài khoản `tanbinhgas`, project `roomdecor` | Link tải APK chỉ giữ 13 ngày, nhớ tải file `.apk` về giữ |
| ngrok | dashboard.ngrok.com | Domain tĩnh miễn phí ở trên |

Thư mục dự án: `C:\Users\TANBINHGAS\Desktop\room-decor-app-springboot`, repo `github.com/aiwana/room-decor-app`, nhánh `master`.

## 3. Cấu hình nằm ở đâu (file bí mật, không commit, không gửi lên chat)

| File | Chứa gì |
|---|---|
| `backend\.env` | `DB_PASSWORD`, `JWT_SECRET`, `GEMINI_API_KEY`, `NGROK_AUTHTOKEN`, `NGROK_DOMAIN`, `STORAGE_BASE_URL=https://cytoplast-junction-washed.ngrok-free.dev/files` |
| `mobile-app\.env` | Chỉ dùng khi chạy Expo Go lúc phát triển |
| `mobile-app\eas.json` | Địa chỉ backend được **đóng cứng vào APK** khi build (profile `production` = ngrok) |
| Jenkins credential `roomdecor-backend-env` | Bản sao `backend\.env` mà Jenkins dùng khi deploy |

**Quan trọng:** sửa `backend\.env` xong thì cập nhật luôn credential `roomdecor-backend-env` trong Jenkins (Manage Jenkins → Credentials). Nếu không, lần sau Jenkins deploy sẽ chạy lại `roomdecor-api` bằng cấu hình cũ. Ví dụ `STORAGE_BASE_URL` cũ sẽ làm ảnh phòng trong app không hiện.

## 4. Khi nào phải build lại APK

Chỉ khi **đổi địa chỉ backend** (đổi domain ngrok, chuyển lên VPS) hoặc **sửa code mobile**:
```powershell
cd C:\Users\TANBINHGAS\Desktop\room-decor-app-springboot\mobile-app
eas build -p android --profile production
```
Sửa code backend thì **không** cần build lại APK, chỉ cần build lại container (hoặc để Jenkins deploy):
```powershell
cd ..\backend
docker compose -f docker-compose.existing-db.yml --profile public up -d --build
```
Đổi Wi-Fi (ở trường hay ở nhà) **không** ảnh hưởng tới APK production, vì app đi qua ngrok.

## 4b. Demo Jenkins cho thầy (ở trường)

Mọi thứ chạy trên laptop, nên chỉ cần mang laptop đi:

1. Hôm trước: chạy thử job 1 lần ở nhà để cache Maven/npm/image, và cập nhật credential `roomdecor-backend-env` cho giống `backend\.env`.
2. Ở trường: mở Docker Desktop, kết nối Wi-Fi có Internet (Jenkins phải lấy code từ GitHub).
3. `http://localhost:8089` → `roomdecor-springboot-ci` → **Build Now**, chiếu Stage View lên máy chiếu.
4. Trong lúc chờ: SonarQube `http://localhost:9001`, Grafana `http://localhost:3030`.
5. Build xong: mở app trên điện thoại để chứng minh bản vừa deploy chạy thật.

Không mở Jenkins ra Internet (ngrok): Jenkins có quyền chạy lệnh trên máy, và tài khoản ngrok miễn phí chỉ có 1 đường hầm (đang dùng cho backend). Thầy chỉ muốn đọc pipeline thì xem `Jenkinsfile` trên GitHub.

## 5. Lỗi hay gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| App báo "Không kết nối được máy chủ" | Laptop tắt, Docker chưa chạy, hoặc `roomdecor-tunnel` không chạy | Làm lại mục 1, kiểm tra bước 4 |
| `curl` ngrok báo `ERR_NGROK_...` | Token hoặc domain trong `.env` sai, hoặc ngrok đang chạy ở nơi khác (bản miễn phí chỉ cho 1 đường hầm) | `docker compose -f docker-compose.existing-db.yml --profile public logs --tail 20 tunnel` |
| `roomdecor-api` không `healthy` | `room-decor-postgres` chưa chạy | `docker start room-decor-postgres` rồi chờ 30 giây |
| App đăng nhập được nhưng ảnh phòng không hiện | `STORAGE_BASE_URL` sai | Sửa `.env` thành địa chỉ ngrok, chạy lại `up -d` (và cập nhật credential Jenkins) |
| Cổng 8080 bị chiếm | Đang chạy `mvnw spring-boot:run` cùng lúc | Tắt mvnw (Ctrl+C), chỉ dùng bản Docker |
| AI quét phòng chậm hoặc lỗi | Gemini bận (lỗi 429/503) | Backend tự thử lại, chờ rồi bấm Quét lại |

## 6. Tuyệt đối không làm

- `docker compose down -v`, `docker volume prune`, `docker system prune`, hoặc xoá `room-decor-postgres`: **mất toàn bộ tài khoản và thiết kế**. Muốn tắt tạm thì dùng `docker stop <tên>`.
- Commit hoặc gửi lên chat các file `.env`, `NGROK_AUTHTOKEN`, `JWT_SECRET`, `GEMINI_API_KEY`, mật khẩu DB.
- Sửa các migration Flyway cũ (`V1__` đến `V8__`). Muốn đổi bảng thì thêm file `V9__...`.
- Đụng vào `portal-sonar-db`: đó là DB riêng của SonarQube.
- Chạy ngrok ở 2 nơi cùng lúc (tài khoản miễn phí chỉ được 1 đường hầm).

## 7. Tài liệu chi tiết

- [06-dong-goi-docker-jenkins-apk.md](06-dong-goi-docker-jenkins-apk.md): Docker, ngrok, build APK
- [07-jenkins-sonar-giam-sat.md](07-jenkins-sonar-giam-sat.md): Jenkins, SonarQube, Prometheus, Grafana
- [api.md](api.md), [api-auth.md](api-auth.md): danh sách API
