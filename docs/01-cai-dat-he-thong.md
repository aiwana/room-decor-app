# Bước 1. Cài đặt hệ thống: Docker, PostgreSQL, backend, Jenkins, SonarQube

Cập nhật: 15/10/2026. Áp dụng cho Windows 10/11 + PowerShell + Docker Desktop.

Tài liệu này giúp một thành viên mới dựng lại **đúng hệ thống đang chạy trên máy của Khanh**:

- PostgreSQL riêng cho app (container `room-decor-postgres`).
- Backend chạy trong Docker (container `room-decor-backend`).
- Jenkins + SonarQube (stack `cicd-portal`) với job `room-decor-ci`: typecheck, lint, quét SonarQube + Quality Gate, build Docker image backend.

Làm lần lượt từ mục 1 tới mục 7. Mỗi bước có **kết quả mong đợi**; chỉ đi tiếp khi đã thấy đúng kết quả đó.
Xong file này thì sang [Bước 2: chạy app mobile](./02-chay-app-mobile.md). Thứ tự đầy đủ xem ở [docs/README.md](./README.md).

> **Quy tắc bảo mật xuyên suốt:** không gửi file `.env`, mật khẩu, `JWT_SECRET` hay token vào chat, ảnh chụp, hay commit lên GitHub. Mỗi người tự sinh secret riêng trên máy mình theo hướng dẫn.

---

## Mục lục

1. [Tổng quan: những gì sẽ chạy trên máy](#1-tổng-quan-những-gì-sẽ-chạy-trên-máy)
2. [Chuẩn bị máy](#2-chuẩn-bị-máy)
3. [Lấy mã nguồn](#3-lấy-mã-nguồn)
4. [PostgreSQL cho app](#4-postgresql-cho-app)
5. [Backend trong Docker](#5-backend-trong-docker)
6. [Jenkins + SonarQube](#6-jenkins--sonarqube)
7. [Job Jenkins `room-decor-ci`](#7-job-jenkins-room-decor-ci)
8. [Dùng hằng ngày](#8-dùng-hằng-ngày)
9. [Những lệnh tuyệt đối không chạy](#9-những-lệnh-tuyệt-đối-không-chạy)
10. [Lỗi thường gặp](#10-lỗi-thường-gặp)
11. [Phụ lục: các file cấu hình](#11-phụ-lục-các-file-cấu-hình)

---

## 1. Tổng quan: những gì sẽ chạy trên máy

| Thành phần | Container | Mở ở đâu | Mạng Docker | Dữ liệu lưu ở |
| --- | --- | --- | --- | --- |
| DB của app | `room-decor-postgres` | `127.0.0.1:5433` | `room-decor-net` | volume `room_decor_pg_data` |
| Backend API | `room-decor-backend` | `http://localhost:3001` | `room-decor-net` | ảnh upload ở `backend\storage` |
| DB của SonarQube | `portal-sonar-db` | không mở ra ngoài | `cicd-portal` | volume `cicd-portal_sonar_db_data` |
| SonarQube | `portal-sonarqube` | `http://localhost:9001` | `cicd-portal` | volume `cicd-portal_sonar_data`, `..._sonar_extensions`, `..._sonar_logs` |
| Jenkins | `portal-jenkins` | `http://localhost:8089` | `cicd-portal` | volume `cicd-portal_jenkins_home` |

Hai điều cần hiểu trước:

- **Có hai PostgreSQL riêng biệt.** Một của app, một của SonarQube. Không bao giờ dùng lẫn.
- **Trong container, `localhost` là chính container đó**, không phải máy Windows. Vì vậy backend trong Docker gọi DB bằng tên `room-decor-postgres:5432` qua mạng `room-decor-net`, chứ không dùng `localhost:5433`. Còn Jenkins gọi SonarQube bằng `http://sonarqube:9000` qua mạng `cicd-portal`.

Jenkins dùng **chung Docker Engine** với máy bạn (qua `docker.sock`), nên khi pipeline build image thì image đó xuất hiện trong `docker image ls` của bạn.

---

## 2. Chuẩn bị máy

Cần cài:

| Phần mềm | Ghi chú |
| --- | --- |
| **Docker Desktop** (backend WSL 2) | Mở lên, chờ góc dưới hiện *Engine running* |
| **Git** | Để clone repo |
| **Node.js 24 LTS** | Cần cho [Bước 2](./02-chay-app-mobile.md) (app Expo) và [Bước 3](./03-backend-chay-truc-tiep.md) (`npm run dev`). Chỉ dựng Docker/Jenkins thì chưa cần |

Yêu cầu: RAM tối thiểu 8 GB (SonarQube khá nặng), còn trống khoảng 10 GB ổ đĩa, có Internet (tải image, plugin, tool).

Kiểm tra (mở PowerShell):

```powershell
docker version --format "Client {{.Client.Version}} / Server {{.Server.Version}}"
git --version
Get-NetTCPConnection -State Listen -LocalPort 3000,3001,5433,8089,9001,50001 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
```

Kết quả mong đợi: Docker in ra 2 số phiên bản (không báo lỗi `cannot connect`). Lệnh cuối **không in gì**, tức là các cổng cần dùng đều đang trống. Nếu có cổng bị chiếm, tắt chương trình đó hoặc hỏi nhóm trước khi đổi cổng.

---

## 3. Lấy mã nguồn

```powershell
cd $HOME\Desktop
git clone https://github.com/aiwana/room-decor-app.git
cd room-decor-app
git switch backend-db
git --no-pager log --oneline -1
```

Kết quả mong đợi: đang ở nhánh `backend-db`, và thư mục `backend` có file `Dockerfile` và `.dockerignore`:

```powershell
Test-Path backend\Dockerfile, backend\.dockerignore
```

Cả hai phải ra `True`.

---

## 4. PostgreSQL cho app

### 4.1 Sinh secret và các file cấu hình (ngoài repo)

Mọi file chứa mật khẩu đặt trong `C:\Users\<bạn>\.room-decor`, **nằm ngoài repo**, nên không thể lỡ commit hay lọt vào image.

Chạy **cả khối trong cùng một cửa sổ PowerShell**, đứng ở thư mục `room-decor-app`:

```powershell
New-Item -ItemType Directory -Force "$HOME\.room-decor" | Out-Null
$dbpw = [guid]::NewGuid().ToString('N')
$jwt  = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')

# 1) Cấu hình cho container PostgreSQL
[IO.File]::WriteAllLines("$HOME\.room-decor\postgres.env", @(
  "POSTGRES_USER=roomdecor_app",
  "POSTGRES_PASSWORD=$dbpw",
  "POSTGRES_DB=room_decor"
))

# 2) Cấu hình cho container backend (DB gọi bằng tên container, cổng trong 5432)
[IO.File]::WriteAllLines("$HOME\.room-decor\backend.docker.env", @(
  "PORT=3000",
  "DATABASE_URL=postgresql://roomdecor_app:$dbpw@room-decor-postgres:5432/room_decor",
  "JWT_SECRET=$jwt",
  "CORS_ORIGINS=http://localhost:8081,http://localhost:19006",
  "UPLOAD_DIR=/app/storage/uploads",
  "MAX_UPLOAD_BYTES=10485760",
  "PGSSL=false"
))

# 3) Cấu hình cho backend chạy bằng npm run dev trên Windows (DB qua 127.0.0.1:5433)
[IO.File]::WriteAllLines("$PWD\backend\.env", @(
  "PORT=3000",
  "DATABASE_URL=postgresql://roomdecor_app:$dbpw@127.0.0.1:5433/room_decor",
  "JWT_SECRET=$jwt",
  "CORS_ORIGINS=http://localhost:8081,http://localhost:19006",
  "UPLOAD_DIR=./storage/uploads",
  "MAX_UPLOAD_BYTES=10485760",
  "PGSSL=false"
))
Remove-Variable dbpw, jwt
git check-ignore -v backend\.env
```

Giải thích:

- Mật khẩu DB (32 ký tự) và `JWT_SECRET` (64 ký tự) được sinh ngẫu nhiên, chỉ gồm chữ số và `a-f`, nên không cần mã hoá URL trong `DATABASE_URL`. `JWT_SECRET` phải dài ít nhất 32 ký tự, nếu không backend sẽ từ chối khởi động.
- `[IO.File]::WriteAllLines` ghi UTF-8 **không BOM**. Không dùng `Set-Content -Encoding utf8` của PowerShell 5, vì BOM làm Docker đọc sai tên biến đầu tiên.
- Giá trị **không** được đặt trong dấu nháy, vì `docker --env-file` giữ nguyên dấu nháy.
- Lệnh cuối phải in ra một dòng `.gitignore:...:.env  backend\.env`, xác nhận `backend\.env` không lên GitHub.

> Nếu file `backend\.env` đã có từ trước, khối trên sẽ **ghi đè** nó. Hãy sao lưu trước nếu cần.

### 4.2 Tạo mạng và chạy PostgreSQL

```powershell
docker network create room-decor-net
docker run -d --name room-decor-postgres --restart unless-stopped --network room-decor-net --env-file "$HOME\.room-decor\postgres.env" -p 127.0.0.1:5433:5432 -v room_decor_pg_data:/var/lib/postgresql/data postgres:16-alpine
Start-Sleep -Seconds 5
docker exec room-decor-postgres pg_isready -U roomdecor_app -d room_decor
```

Ý nghĩa:

- `room-decor-net`: mạng Docker riêng. Trong mạng do mình tạo, các container gọi nhau được bằng tên (mạng `bridge` mặc định không làm được).
- `-p 127.0.0.1:5433:5432`: chỉ máy bạn kết nối được, qua cổng 5433. Dùng 5433 để không đụng PostgreSQL khác có thể đã cài sẵn ở 5432.
- `-v room_decor_pg_data:...`: dữ liệu nằm trong volume, xoá container cũng không mất.
- `--restart unless-stopped`: tự bật lại khi khởi động máy.

Kết quả mong đợi: `accepting connections`.

> Biến `POSTGRES_*` **chỉ có tác dụng lần đầu**, khi volume còn trống. Nếu volume `room_decor_pg_data` đã tồn tại từ trước với mật khẩu khác, đổi file env sẽ không đổi được mật khẩu; hỏi nhóm thay vì xoá volume.

Không cần tạo bảng: backend tự tạo bảng và dữ liệu mẫu (7 danh mục, 18 sản phẩm) ở lần chạy đầu.

---

## 5. Backend trong Docker

### 5.1 Build image

```powershell
cd backend
docker build -t room-decor-backend:local .
docker image ls room-decor-backend
```

Dockerfile build 2 giai đoạn: giai đoạn 1 cài đủ thư viện và chạy `tsc` để biên dịch `src` thành `dist`; giai đoạn 2 chỉ giữ thư viện production và `dist`, chạy bằng user `node` (không phải root). `.dockerignore` chặn `node_modules`, `dist`, `.env`, `storage` khỏi image.

Kết quả mong đợi: build không có `ERROR`, image khoảng 265 MB. Lần đầu mất vài phút (tải `node:24-alpine`, chạy `npm ci`), các lần sau nhanh hơn nhờ cache.

### 5.2 Chạy container

```powershell
New-Item -ItemType Directory -Force storage\uploads | Out-Null
docker run -d --init --restart unless-stopped --name room-decor-backend --network room-decor-net --env-file "$HOME\.room-decor\backend.docker.env" -p 127.0.0.1:3001:3000 -v "${PWD}\storage:/app/storage" room-decor-backend:local
Start-Sleep -Seconds 5
docker ps --filter name=room-decor --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs room-decor-backend
curl.exe -s http://localhost:3001/health
```

Ý nghĩa các tham số:

| Tham số | Vì sao |
| --- | --- |
| `--init` | Chèn tiến trình `tini` làm PID 1 để `docker stop` tắt êm Node (không có thì phải chờ 10 giây rồi bị giết, mã `137`) |
| `--network room-decor-net` | Gọi được DB bằng tên `room-decor-postgres` |
| `--env-file ...` | Nạp cấu hình từ file ngoài repo, secret không nằm trong image |
| `-p 127.0.0.1:3001:3000` | Cổng 3001 trên máy vào cổng 3000 trong container. Để 3000 trống cho `npm run dev` |
| `-v "${PWD}\storage:/app/storage"` | Ảnh upload ghi ra ổ đĩa Windows, xoá hay build lại container không mất |

Kết quả mong đợi:

- `docker ps`: `room-decor-backend` là `Up ... (healthy)` (có thể là `health: starting` trong 30 giây đầu), `room-decor-postgres` là `Up`.
- `docker logs`: `Backend is running at http://localhost:3000` (3000 là cổng bên trong container).
- `curl`: `{"status":"ok","message":"Room Decor AI backend is running"}`. Endpoint này chạy `SELECT 1` trên DB, nên `ok` nghĩa là đã kết nối DB thành công.

### 5.3 Kiểm tra nhanh API (tuỳ chọn)

```powershell
(Invoke-RestMethod http://localhost:3001/api/categories).Count
(Invoke-RestMethod http://localhost:3001/api/products).Count
```

Kết quả mong đợi: `7` và `18`.

---

## 6. Jenkins + SonarQube

### 6.1 Tạo thư mục `cicd-portal`

Stack này **không nằm trong repo app**. Tạo thư mục `C:\Users\<bạn>\Desktop\cicd-portal` với 3 file, nội dung ở [mục 11](#11-phụ-lục-các-file-cấu-hình):

```
cicd-portal\
├── docker-compose.yml
├── .env.example
└── jenkins\
    └── Dockerfile
```

Cách tạo file an toàn bằng Notepad (tránh bị thêm đuôi `.txt`): tạo file rỗng trước, rồi mới mở.

```powershell
New-Item -ItemType Directory -Force "$HOME\Desktop\cicd-portal\jenkins" | Out-Null
cd "$HOME\Desktop\cicd-portal"
New-Item docker-compose.yml, .env.example, jenkins\Dockerfile -ItemType File
notepad docker-compose.yml
notepad .env.example
notepad jenkins\Dockerfile
```

Dán nội dung tương ứng vào từng cửa sổ, Ctrl+S, đóng.

### 6.2 Đặt mật khẩu DB của SonarQube và khởi động

```powershell
Copy-Item .env.example .env
notepad .env
```

Trong `.env`, đổi `SONAR_DB_PASSWORD=ChangeMe_SonarDb123` thành một mật khẩu của riêng bạn (chỉ dùng chữ và số cho đơn giản), lưu lại. Không gửi file này cho ai.

```powershell
docker compose up -d --build
docker compose ps
```

Lần đầu mất 3–10 phút (build image Jenkins có Docker CLI, tải SonarQube). Chạy lại `docker compose ps` cho tới khi `portal-sonar-db`, `portal-sonarqube`, `portal-jenkins` đều `Up ... (healthy)`. Sau đó:

```powershell
Invoke-RestMethod http://localhost:9001/api/system/status
```

Kết quả mong đợi: `status : UP` (nếu là `STARTING` thì chờ thêm 1 phút).

### 6.3 Jenkins: thiết lập lần đầu

1. Lấy mật khẩu mở khoá:

   ```powershell
   docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
   ```

2. Mở http://localhost:8089, dán mật khẩu, **Continue**.
3. Chọn **Install suggested plugins**, chờ cài xong.
4. **Create First Admin User**: tạo tài khoản quản trị của bạn.
5. **Instance Configuration**: giữ `http://localhost:8089/`, **Save and Finish**.

### 6.4 Jenkins: cài thêm plugin

**Manage Jenkins → Plugins → Available plugins**, tìm và tick:

| Plugin | Dùng cho |
| --- | --- |
| **SonarQube Scanner** | `withSonarQubeEnv`, `waitForQualityGate`, tool `sonar-scanner` |
| **NodeJS** | tool `node20` |
| **Pipeline: Stage View** (tuỳ chọn) | xem màu từng stage trên trang job |

Bấm **Install**, tick **Restart Jenkins when installation is complete and no jobs are running**, chờ Jenkins khởi động lại rồi đăng nhập.

### 6.5 SonarQube: tài khoản, quyền, token, webhook

Mở http://localhost:9001.

1. **Đổi mật khẩu admin**: đăng nhập `admin` / `admin`, SonarQube bắt đổi ngay (≥ 12 ký tự, có hoa, thường, số, ký tự đặc biệt).
2. **Tạo user cho Jenkins**: *Administration → Security → Users → Create User*. Login `jenkins`, Name `Jenkins CI`, mật khẩu mạnh bất kỳ.
3. **Cấp quyền**: *Administration → Security → Global Permissions*, tìm `jenkins`, tick **Execute Analysis** và **Create Projects**. Lần quét đầu sẽ tự tạo 2 project `room-decor-app-backend` và `room-decor-app-mobile`.
4. **Tạo token**: *Administration → Security → Users*, dòng `jenkins`, cột **Tokens**, bấm biểu tượng cập nhật. Name `jenkins-ci`, **Generate**, **copy token ngay** (dạng `squ_...`, chỉ hiện một lần). Không dán token vào chat.
5. **Webhook báo kết quả Quality Gate về Jenkins**: *Administration → Configuration → Webhooks → Create*. Name `jenkins`, URL `http://jenkins:8080/sonarqube-webhook/` (có dấu `/` cuối). Thiếu webhook thì stage chờ Quality Gate sẽ treo tới khi hết giờ.

> `jenkins:8080` và `sonarqube:9000` là tên service + cổng **bên trong** mạng `cicd-portal`, không phải `localhost:8089`/`9001`.

Quality Gate dùng mặc định **Sonar way**, không cần chỉnh.

### 6.6 Jenkins: Tools

**Manage Jenkins → Tools**, điền **đúng tên** (script gọi bằng tên này):

| Mục | Name | Cách cài |
| --- | --- | --- |
| **NodeJS installations** → Add NodeJS | `node20` | Tick *Install automatically* → *Install from nodejs.org* → chọn **NodeJS 20.x** mới nhất (phải ≥ 20.19.4) |
| **SonarQube Scanner installations** → Add SonarQube Scanner | `sonar-scanner` | Tick *Install automatically* → *Install from Maven Central* → bản mới nhất |

Bấm **Save**. Jenkins chỉ tải tool về ở lần build đầu tiên dùng tới nó. Nếu danh sách phiên bản trống: *Manage Jenkins → Plugins → Updates → Check now*, rồi tải lại trang Tools.

### 6.7 Jenkins: Credential và kết nối SonarQube

1. **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**:
   - Kind: **Secret text**
   - Secret: token `squ_...` vừa tạo
   - ID: `sonar-token` (gõ đúng, không để trống)
2. **Manage Jenkins → System → SonarQube servers**:
   - Tick **Environment variables: Enable injection of SonarQube server configuration...**
   - **Add SonarQube**: Name `SonarQube`, Server URL `http://sonarqube:9000`, token chọn `sonar-token`
   - **Save**.

Repo `aiwana/room-decor-app` là public nên **không cần** credential Git.

### 6.8 Kiểm tra Jenkins dùng được Docker

```powershell
docker exec portal-jenkins docker version --format "Client {{.Client.Version}} / Server {{.Server.Version}}"
```

Kết quả mong đợi: in ra 2 số phiên bản. Nếu báo `permission denied ... docker.sock`, kiểm tra `DOCKER_GID=0` trong `.env` của `cicd-portal` (đúng cho Docker Desktop), rồi chạy lại `docker compose up -d`.

---

## 7. Job Jenkins `room-decor-ci`

1. Ở trang chủ Jenkins: **New Item** → tên `room-decor-ci` → chọn **Pipeline** → **OK**.
2. Kéo xuống mục **Pipeline**: Definition **Pipeline script**, dán **toàn bộ** script ở [mục 11.4](#114-script-jenkins-room-decor-ci), giữ tick **Use Groovy Sandbox** → **Save**.
3. **Build Now**, mở build `#1` → **Console Output**.

Luồng của pipeline:

```
Checkout (backend-db) → Kiểm tra Node + lockfile → Backend: npm ci + typecheck
→ Mobile: npm ci, typecheck, lint
→ SonarQube backend + chờ Quality Gate
→ Backend: Docker build (build image ci-<số build>, kiểm tra, xoá)
→ SonarQube mobile + chờ Quality Gate
```

Kết quả mong đợi ở cuối log: `Finished: SUCCESS`. Trong log có các dòng:

- `Quality gate is 'OK'` (2 lần, backend và mobile).
- `Docker engine: ...`, `Image check: OK` (image chạy bằng user `node`, không có `.env` và `src`).
- `Untagged: room-decor-backend:ci-<số build>`: image thử nghiệm đã được xoá, không đụng image `room-decor-backend:local` hay container đang chạy.

Lần build đầu lâu hơn (3–6 phút) vì phải tải Node, SonarScanner và image `node:24-alpine`. Cảnh báo `npm warn deprecated` và `npm warn using --force` là bình thường.

Job chưa tự chạy khi có commit mới; bấm **Build Now** khi muốn kiểm tra.

---

## 8. Dùng hằng ngày

### Sau khi bật máy

Mở Docker Desktop và chờ *Engine running*. Tất cả container đều có `restart: unless-stopped` nên tự chạy lại. Kiểm tra nhanh:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
Invoke-RestMethod http://localhost:9001/api/system/status
curl.exe -s http://localhost:3001/health
```

Phải có 5 container `Up`: `portal-sonar-db`, `portal-sonarqube`, `portal-jenkins`, `room-decor-postgres`, `room-decor-backend`. Nếu thiếu cái nào, chạy `docker start <tên>` (với 3 container `portal-*` thì vào thư mục `cicd-portal` và chạy `docker compose up -d`).

### Vận hành backend container

| Việc | Lệnh |
| --- | --- |
| Xem log | `docker logs --tail 50 room-decor-backend` (thêm `-f` để xem liên tục, Ctrl+C để thoát) |
| Khởi động lại | `docker restart room-decor-backend` |
| Dừng / chạy lại | `docker stop room-decor-backend` / `docker start room-decor-backend` |

### Sau khi sửa code backend

Container luôn gắn với image lúc nó được tạo, nên phải build image mới rồi **tạo lại** container. Đứng trong thư mục `backend`:

```powershell
git pull origin backend-db
docker build -t room-decor-backend:local .
docker stop room-decor-backend; docker rm room-decor-backend
docker run -d --init --restart unless-stopped --name room-decor-backend --network room-decor-net --env-file "$HOME\.room-decor\backend.docker.env" -p 127.0.0.1:3001:3000 -v "${PWD}\storage:/app/storage" room-decor-backend:local
curl.exe -s http://localhost:3001/health
```

`docker rm` ở đây chỉ xoá container backend. Dữ liệu nằm trong PostgreSQL (volume) và ảnh nằm trong `backend\storage`, nên không mất gì.

### Chạy backend bằng `npm run dev` (khi đang sửa code)

Xem [Bước 3: chạy backend trực tiếp](./03-backend-chay-truc-tiep.md). Bản dev chạy ở `http://localhost:3000` và dùng chung DB với bản Docker (qua `127.0.0.1:5433`).

---

## 9. Những lệnh tuyệt đối không chạy

Các lệnh này xoá dữ liệu không lấy lại được (job Jenkins, kết quả SonarQube, tài khoản và thiết kế trong DB app):

- `docker compose down -v`, `docker volume rm ...`, `docker volume prune`, `docker system prune`.
- `docker rm` với `room-decor-postgres`, `portal-sonar-db`, `portal-sonarqube`, `portal-jenkins`. Muốn tắt tạm thì dùng `docker stop` hoặc `docker compose stop`.
- Sửa cấu hình hay xoá `portal-sonar-db`: đó là DB riêng của SonarQube.
- `git add .` trong repo: dễ kéo theo file đang sửa dở (ví dụ `package.json`, `package-lock.json`) vào commit. Luôn `git add` đúng tên file. (Ảnh upload trong `backend/storage/uploads` đã nằm trong `.gitignore`.)
- `npm audit fix` hoặc nâng hàng loạt thư viện.
- Gửi `.env`, mật khẩu, `JWT_SECRET`, token SonarQube vào chat, ảnh chụp hay commit.

---

## 10. Lỗi thường gặp

| Dấu hiệu | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| `docker` báo `cannot connect to the Docker daemon` | Docker Desktop chưa mở xong | Mở Docker Desktop, chờ *Engine running* |
| `docker run` báo `port is already allocated` | Cổng đang bị chương trình khác dùng | Xem mục 2; tắt chương trình đó hoặc hỏi nhóm trước khi đổi cổng |
| Backend log `Invalid backend environment` | Thiếu biến hoặc `JWT_SECRET` < 32 ký tự trong file env | Kiểm tra tên biến (không in giá trị): `Get-Content "$HOME\.room-decor\backend.docker.env" \| % { ($_ -split '=',2)[0] }` |
| Backend log `Backend startup failed` + `ECONNREFUSED` hoặc `ENOTFOUND room-decor-postgres` | Postgres tắt, hoặc backend không cùng mạng `room-decor-net` | `docker start room-decor-postgres`; kiểm tra lệnh `docker run` có `--network room-decor-net` |
| Backend log `password authentication failed` | Volume DB đã tạo trước đó với mật khẩu khác | Không xoá volume; hỏi nhóm để đặt lại mật khẩu bằng `ALTER ROLE` |
| `docker stop` mất 10 giây, trạng thái `Exited (137)` | Container tạo thiếu `--init` | Tạo lại container theo mục 5.2 |
| `localhost:9001` chưa mở được sau khi bật máy | SonarQube đang khởi động | Chờ 1–2 phút, kiểm tra `/api/system/status` ra `UP` |
| Jenkins: `Tool type "nodejs" does not have an install of "node20"` | Sai/thiếu tên tool | Mục 6.6, tên phải đúng `node20`, `sonar-scanner` |
| Jenkins: `No such DSL method 'withSonarQubeEnv'` | Chưa cài plugin SonarQube Scanner | Mục 6.4, nhớ restart Jenkins |
| Jenkins: `Not authorized` khi quét SonarQube | Token sai hoặc user `jenkins` thiếu quyền | Mục 6.5 bước 3–4, cập nhật credential `sonar-token` |
| Jenkins treo ở `waitForQualityGate` tới khi hết giờ | Thiếu webhook hoặc URL webhook sai | Mục 6.5 bước 5; SonarQube → Webhooks → xem *Last delivery* |
| Jenkins: `permission denied ... /var/run/docker.sock` | `DOCKER_GID` sai | `DOCKER_GID=0` trong `.env` của `cicd-portal`, rồi `docker compose up -d` |
| `git diff` hiện `:` hoặc `(END)` và đứng im | Git mở trình xem | Bấm `q`, hoặc dùng `git --no-pager diff` |

---

## 11. Phụ lục: các file cấu hình

### 11.1 `cicd-portal/docker-compose.yml`

```yaml
# =============================================
# Docker Compose - Hạ tầng CI/CD (bản cấu hình qua PORTAL)
# Jenkins + SonarQube "trần": mọi plugin, tool, secret, kết nối đều cấu hình
# trên giao diện web, không dùng file YAML/JCasC. Hướng dẫn: README.md
#
# Khởi động: docker compose up -d --build
# Chạy song song được với stack ../cicd (khác tên container, network, port).
# =============================================

name: cicd-portal

services:

  # --- Database cho SonarQube (PostgreSQL) ---
  sonar-db:
    image: postgres:16-alpine
    container_name: portal-sonar-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: sonarqube
      POSTGRES_USER: ${SONAR_DB_USER:-sonar}
      POSTGRES_PASSWORD: ${SONAR_DB_PASSWORD:?Chưa đặt SONAR_DB_PASSWORD trong .env}
    volumes:
      - sonar_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d sonarqube"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - cicd-portal

  # --- SonarQube Community Build ---
  sonarqube:
    image: sonarqube:${SONARQUBE_TAG:-26.8.0.126808-community}
    container_name: portal-sonarqube
    restart: unless-stopped
    depends_on:
      sonar-db:
        condition: service_healthy
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://sonar-db:5432/sonarqube
      SONAR_JDBC_USERNAME: ${SONAR_DB_USER:-sonar}
      SONAR_JDBC_PASSWORD: ${SONAR_DB_PASSWORD}
      # Bỏ kiểm tra vm.max_map_count (máy dev / Docker Desktop). Server Linux: xem README mục Xử lý sự cố
      SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: "true"
    ulimits:
      nofile:
        soft: 131072
        hard: 131072
      nproc: 8192
    volumes:
      - sonar_data:/opt/sonarqube/data
      - sonar_extensions:/opt/sonarqube/extensions
      - sonar_logs:/opt/sonarqube/logs
    ports:
      - "${SONAR_PORT:-9001}:9000"
    healthcheck:
      test: ["CMD-SHELL", "curl -fs http://localhost:9000/api/system/status | grep -q '\"status\":\"UP\"'"]
      interval: 15s
      timeout: 10s
      retries: 40
      start_period: 60s
    networks:
      - cicd-portal

  # --- Jenkins (LTS gốc + Docker CLI, cấu hình qua Setup Wizard và giao diện web) ---
  jenkins:
    build:
      context: ./jenkins
      args:
        JENKINS_VERSION: ${JENKINS_VERSION:-2.568.3}
    image: cicd-portal-jenkins:${JENKINS_VERSION:-2.568.3}
    container_name: portal-jenkins
    restart: unless-stopped
    # Cho user "jenkins" quyền dùng docker.sock của máy host
    # (Docker Desktop: GID 0 | Linux: getent group docker | cut -d: -f3)
    group_add:
      - "${DOCKER_GID:-0}"
    environment:
      JAVA_OPTS: -Duser.timezone=${TZ:-Asia/Ho_Chi_Minh}
      TZ: ${TZ:-Asia/Ho_Chi_Minh}
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    extra_hosts:
      # Cho phép pipeline gọi tới app đã deploy trên máy host (smoke test sau deploy)
      - "host.docker.internal:host-gateway"
    ports:
      - "${JENKINS_PORT:-8089}:8080"
      - "${JENKINS_AGENT_PORT:-50001}:50000"
    healthcheck:
      test: ["CMD-SHELL", "curl -fs -o /dev/null http://localhost:8080/login"]
      interval: 15s
      timeout: 5s
      retries: 20
      start_period: 60s
    networks:
      - cicd-portal

volumes:
  jenkins_home:
  sonar_db_data:
  sonar_data:
  sonar_extensions:
  sonar_logs:

networks:
  cicd-portal:
    name: cicd-portal
```

> Tuỳ chọn bảo mật: nếu dùng mạng Wi-Fi chung (ký túc xá, quán cà phê), đổi phần `ports` thành `"127.0.0.1:${SONAR_PORT:-9001}:9000"`, `"127.0.0.1:${JENKINS_PORT:-8089}:8080"` và bỏ dòng cổng `50000` để máy khác trong mạng không truy cập được Jenkins/SonarQube.

### 11.2 `cicd-portal/jenkins/Dockerfile`

Jenkins LTS gốc cộng thêm Docker CLI, để pipeline gọi được Docker Engine của máy qua `docker.sock`.

```dockerfile
# =============================================
# Image Jenkins cho cách cấu hình qua PORTAL
# Chỉ là Jenkins LTS gốc + Docker CLI (để pipeline build image / deploy).
# KHÔNG cài sẵn plugin, tool hay cấu hình nào: tất cả làm trên giao diện web
# (Setup Wizard, Plugins, Tools, Credentials, System) theo README.md.
# =============================================
ARG JENKINS_VERSION=2.568.3
FROM jenkins/jenkins:${JENKINS_VERSION}-lts-jdk21

USER root

# Docker CLI + compose plugin – dùng Docker của máy host qua /var/run/docker.sock
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends docker-ce-cli docker-buildx-plugin docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/*

USER jenkins
```

### 11.3 `cicd-portal/.env.example`

```dotenv
# =============================================
# Biến HẠ TẦNG cho stack cicd-portal – copy thành ".env"
#   PowerShell : Copy-Item .env.example .env
#   Bash       : cp .env.example .env
# Ở cách này, mọi secret của ỨNG DỤNG (token Sonar, Git, Docker Hub, MongoDB...)
# đều nhập trên giao diện Jenkins → Credentials, KHÔNG đặt ở đây.
# =============================================

JENKINS_VERSION=2.568.3
JENKINS_PORT=8089
JENKINS_AGENT_PORT=50001

# GID của group sở hữu /var/run/docker.sock
#   Docker Desktop (Windows/macOS): 0
#   Linux: getent group docker | cut -d: -f3
DOCKER_GID=0

SONARQUBE_TAG=26.8.0.126808-community
SONAR_PORT=9001
SONAR_DB_USER=sonar
SONAR_DB_PASSWORD=ChangeMe_SonarDb123

TZ=Asia/Ho_Chi_Minh
```

Copy thành `.env` và **đổi `SONAR_DB_PASSWORD`** (mục 6.2). Không commit `.env`.

### 11.4 Script Jenkins `room-decor-ci`

```groovy
// room-decor-ci - Bước 3: kiểm tra code + SonarQube + Quality Gate + build Docker image backend. KHÔNG deploy
// Docker: Jenkins dùng chung Docker Engine với Sonar/DB/backend, nên chỉ build và xoá đúng image ci-<số build>, không prune/down.
// Repo public nên không cần git credential. Token SonarQube do withSonarQubeEnv tự nạp, không ghi trong script.
pipeline {
    agent any
    tools { nodejs 'node20' }
    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    environment {
        CI = 'true'
        EXPO_NO_TELEMETRY = '1'
        NPM_CONFIG_AUDIT = 'false'
        NPM_CONFIG_FUND = 'false'
        SCANNER_HOME = tool 'sonar-scanner'
    }
    stages {
        stage('Checkout') {
            steps {
                deleteDir()   // chỉ xoá workspace của job này, để mỗi lần là bản clone sạch
                git branch: 'backend-db',   // PR #1 (sửa Sonar) và PR #2 (Dockerfile) đã merge vào đây
                url: 'https://github.com/aiwana/room-decor-app.git'
                sh 'git log -1 --format="Commit: %h | %an | %s"'
            }
        }
        stage('Môi trường + lockfile') {
            steps {
                sh '''
                    echo "node $(node -v) / npm $(npm -v)"
                    node -e "const [a,b]=process.versions.node.split('.').map(Number); if (a<20 || (a===20 && b<19)) { console.error('Can Node >= 20.19.4 cho React Native 0.86'); process.exit(1) }"
                    test -f package-lock.json
                    test -f backend/package-lock.json
                    echo "Lockfile: OK"
                '''
            }
        }
        stage('Backend: npm ci + typecheck (độc lập)') {
            // Chạy TRƯỚC khi cài node_modules ở gốc, giống Docker/CI thật.
            // catchError: stage này đỏ thì build vẫn FAILURE, nhưng các stage mobile vẫn chạy để bạn thấy kết quả.
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    dir('backend') {
                        sh 'npm ci'
                        sh 'npm run typecheck'
                    }
                }
            }
        }
        stage('Mobile: npm ci') {
            steps { sh 'npm ci' }
        }
        stage('Mobile: typecheck') {
            steps { sh 'npm run typecheck' }
        }
        stage('Mobile: lint') {
            steps { sh 'npm run lint' }
        }
        stage('SonarQube: backend') {
            steps {
                dir('backend') {
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            "$SCANNER_HOME/bin/sonar-scanner" \
                              -Dsonar.projectKey=room-decor-app-backend \
                              "-Dsonar.projectName=Room Decor AI - Backend" \
                              -Dsonar.sources=src \
                              '-Dsonar.exclusions=**/node_modules/**,dist/**,storage/**' \
                              -Dsonar.typescript.tsconfigPaths=tsconfig.json \
                              -Dsonar.sourceEncoding=UTF-8
                        '''
                    }
                }
                // Chờ SonarQube chấm xong (qua webhook). Gate Failed thì dừng build tại đây.
                timeout(time: 10, unit: 'MINUTES') { waitForQualityGate abortPipeline: true }
                // Xoá báo cáo của backend để bước chờ Quality Gate của mobile không đọc nhầm file report-task.txt
                sh 'rm -rf backend/.scannerwork'
            }
        }
        stage('Backend: Docker build') {
            // Chỉ chạy khi Quality Gate backend đã đạt (stage trước abortPipeline nếu Failed).
            steps {
                dir('backend') {
                    sh '''
                        docker version --format "Docker engine: {{.Server.Version}}"
                        docker build -t room-decor-backend:ci-${BUILD_NUMBER} .
                        # Kiểm tra image: chạy bằng user node, không chứa .env và src, có dist/server.js
                        docker run --rm --entrypoint sh room-decor-backend:ci-${BUILD_NUMBER} -c 'test "$(id -un)" = node && test ! -e /app/.env && test ! -e /app/src && test -f /app/dist/server.js && echo "Image check: OK"'
                        docker image ls room-decor-backend
                    '''
                }
            }
            post {
                // Chỉ xoá đúng image do build này tạo.
                always { sh 'docker rmi room-decor-backend:ci-${BUILD_NUMBER} || true' }
            }
        }
        stage('SonarQube: mobile') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        "$SCANNER_HOME/bin/sonar-scanner" \
                          -Dsonar.projectKey=room-decor-app-mobile \
                          "-Dsonar.projectName=Room Decor AI - Mobile" \
                          -Dsonar.sources=src \
                          '-Dsonar.exclusions=**/node_modules/**,backend/**,assets/**' \
                          -Dsonar.typescript.tsconfigPaths=tsconfig.json \
                          -Dsonar.sourceEncoding=UTF-8
                    '''
                }
                timeout(time: 10, unit: 'MINUTES') { waitForQualityGate abortPipeline: true }
            }
        }
    }
}
```
