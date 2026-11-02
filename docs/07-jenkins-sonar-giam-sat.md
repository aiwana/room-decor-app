# 07. Jenkinsfile (CI/CD + SonarQube + deploy local) và giám sát bằng Prometheus + Grafana

Tài liệu này nối tiếp [06-dong-goi-docker-jenkins-apk.md](06-dong-goi-docker-jenkins-apk.md). Mọi lệnh là **PowerShell**, chạy trong thư mục repo `room-decor-app-springboot`.

## 1. Tổng quan

```
GitHub (master) ──► Jenkins (portal-jenkins, http://localhost:8089)
                      1. Checkout (Jenkinsfile lấy từ repo)
                      2. Backend: mvn verify (70 test + JaCoCo)
                      3. Mobile: npm ci, typecheck, lint
                      4. SonarQube backend  ─┐  http://localhost:9001
                      5. SonarQube mobile   ─┴► Quality Gate (fail thì dừng)
                      6. Docker build image roomdecor-backend:ci-N
                      7. Smoke test: image + Postgres tạm, health UP, có metrics
                      8. Deploy local: docker compose (container roomdecor-api, cổng 8080)
                      9. Deploy giám sát: Prometheus (9090) + Grafana (3030)
                     10. Kiểm tra: health UP, Prometheus thấy backend "up", Grafana OK
```

| Thành phần | Container | Địa chỉ trên máy | Vai trò |
|---|---|---|---|
| Jenkins | `portal-jenkins` | http://localhost:8089 | Chạy pipeline theo `Jenkinsfile` |
| SonarQube | `portal-sonarqube` | http://localhost:9001 | Phân tích chất lượng code, Quality Gate |
| PostgreSQL | `room-decor-postgres` | 127.0.0.1:5433 | CSDL `roomdecor` (không bị pipeline xoá) |
| Backend | `roomdecor-api` | http://localhost:8080 | Spring Boot, do pipeline deploy |
| Prometheus | `roomdecor-prometheus` | http://localhost:9090 | Cứ 15 giây đọc `/actuator/prometheus` |
| Grafana | `roomdecor-grafana` | http://localhost:3030 | Dashboard "RoomDecor Backend" |

## 2. Thay đổi trong code

- `backend/pom.xml`: thêm `micrometer-registry-prometheus`.
- `application.yml`: mở thêm `/actuator/prometheus`; mọi metric có nhãn `application="roomdecor-backend"`; bật histogram cho request HTTP (để tính p95).
- `SecurityConfig`: `/actuator/prometheus` không cần token (chỉ là số đếm và thời gian, không có dữ liệu người dùng). Các endpoint actuator khác vẫn đóng.
- `backend/docker-compose.existing-db.yml`: `env_file` và thư mục ảnh đọc từ biến `BACKEND_ENV_FILE`, `UPLOADS_DIR`. Chạy tay thì không cần đặt, vẫn là `.env` và `./uploads` như cũ.
- `backend/monitoring/`: Prometheus (cấu hình + 3 luật cảnh báo) và Grafana (nguồn dữ liệu + dashboard tự nạp). Cấu hình được **chép vào image** chứ không mount, vì Jenkins chạy trong container, mount file từ workspace của Jenkins sẽ không tới được Docker Desktop.
- `Jenkinsfile` ở thư mục gốc repo.

## 3. Chạy thử bằng tay (trước khi dùng Jenkins)

```powershell
cd backend
.\mvnw verify                                                   # 70 test phải pass
docker compose -f docker-compose.existing-db.yml up -d --build  # build lại backend có metrics
curl.exe http://localhost:8080/actuator/health                  # {"status":"UP"}
curl.exe -s http://localhost:8080/actuator/prometheus | Select-String jvm_memory_used_bytes | Select-Object -First 2

cd monitoring
docker compose up -d --build
docker compose ps                                               # roomdecor-prometheus, roomdecor-grafana: Up
```

- Prometheus: http://localhost:9090 → **Status → Targets**: `roomdecor-backend` phải **UP**. Mục **Alerts** có 3 luật (`RoomDecorApiDown`, `RoomDecorHigh5xxRate`, `RoomDecorHeapHigh`).
- Grafana: http://localhost:3030, đăng nhập `admin` / `admin`, Grafana bắt đổi mật khẩu ở lần đầu. Dashboard **RoomDecor → RoomDecor Backend** mở sẵn.
- Muốn biểu đồ có số liệu: mở app trên điện thoại, đăng nhập, xem nội thất, quét phòng... vài phút.

Thử cảnh báo: `docker stop roomdecor-api`, chờ khoảng 1 phút, Prometheus → Alerts: `RoomDecorApiDown` chuyển **Pending** rồi **Firing**, Grafana ô "Backend UP" thành **DOWN**. Bật lại: `docker start roomdecor-api`.

## 4. Chuẩn bị Jenkins (làm 1 lần)

### 4.1 Credential chứa file `.env` của backend

Pipeline cần mật khẩu DB và JWT secret để deploy, nhưng không được ghi vào code. Jenkins giữ hộ:

**Manage Jenkins → Credentials → System → Global credentials → Add Credentials**
- Kind: **Secret file**
- File: chọn `backend\.env`
- ID: `roomdecor-backend-env`

> Khi đổi `backend\.env` (ví dụ đổi IP), nhớ cập nhật lại credential này.

### 4.2 Kiểm tra Jenkins thấy được thư mục ảnh

Container backend do Jenkins chạy phải dùng đúng thư mục `backend\uploads` trên Windows, nếu không ảnh cũ sẽ mất. Docker Desktop gọi ổ `C:\` là `/run/desktop/mnt/host/c`:

```powershell
docker exec portal-jenkins docker run --rm --entrypoint ls -v /run/desktop/mnt/host/c/Users/TANBINHGAS/Desktop/room-decor-app-springboot/backend/uploads:/u roomdecor-backend:local /u
```

Phải in ra các thư mục/ảnh giống `dir backend\uploads`. Nếu in ra rỗng mà `backend\uploads` có ảnh, báo lại để sửa tham số `UPLOADS_DIR`.

### 4.3 Tạo job

1. Commit và push các file mới lên `master` trước (Jenkins đọc `Jenkinsfile` từ GitHub).
2. **New Item** → tên `roomdecor-springboot-ci` → **Pipeline** → OK.
3. Mục **Pipeline**: Definition **Pipeline script from SCM** → SCM **Git** → Repository URL `https://github.com/aiwana/room-decor-app.git` → Branch `*/master` → Script Path `Jenkinsfile` → **Save**.
4. **Build Now**. Lần đầu Jenkins mới đọc được các tham số, từ lần sau nút thành **Build with Parameters** (`DEPLOY`, `UPLOADS_DIR`).

Các tool `jdk21`, `maven3`, `node20`, `sonar-scanner`, server `SonarQube` và webhook đã cấu hình từ job cũ `room-decor-ci`, dùng lại được.

## 5. Kết quả cần thấy (và chụp ảnh cho báo cáo)

1. Jenkins: **Stage View** của build xanh hết 10 stage; tab **Tests** có 70 test.
2. Console Output đoạn `Smoke test: OK` và `Deploy OK`.
3. SonarQube: 2 project `RoomDecor Spring Boot - Backend` và `- Mobile`, Quality Gate **Passed**, coverage backend.
4. `docker ps` thấy `roomdecor-api`, `roomdecor-prometheus`, `roomdecor-grafana`, `room-decor-postgres`.
5. App hoặc Swagger chạy qua http://localhost:8080 sau khi Jenkins deploy.
6. Prometheus **Targets** (UP) và **Alerts**.
7. Grafana dashboard có số liệu; thêm 1 ảnh khi tắt backend (ô DOWN, cảnh báo Firing).

## 6. Dừng / dọn

```powershell
cd backend\monitoring
docker compose stop          # tạm dừng giám sát
docker compose down          # xoá container, GIỮ dữ liệu
# docker compose down -v     # XOÁ luôn số liệu Prometheus và cài đặt Grafana, chỉ dùng khi chắc chắn
```

Pipeline không bao giờ chạy `down -v`, `prune` hay xoá `room-decor-postgres`.
