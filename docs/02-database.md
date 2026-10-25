# 2. Database (PostgreSQL bằng Docker Compose)

Backend dùng PostgreSQL 16. Mỗi thành viên chạy **database riêng trên máy mình** bằng Docker Compose,
nên dữ liệu (tài khoản, thiết kế) của mỗi máy là riêng. **Cấu trúc bảng** thì giống nhau ở mọi máy vì
nằm trong code (Flyway).

## Bật database lần đầu

Cần Docker Desktop đang chạy và file `backend/.env` đã điền `DB_PASSWORD` (xem [03-chay-backend.md](03-chay-backend.md#1-tạo-file-env)).

```powershell
cd backend
docker compose up -d
docker compose ps        # cột STATUS có "healthy" là xong
```

File `backend/docker-compose.yml` tạo:

| Thứ | Giá trị |
|---|---|
| Container | `roomdecor-db` (image `postgres:16-alpine`) |
| Cổng | `127.0.0.1:5433` (chỉ máy mình truy cập được) |
| Database | `roomdecor` |
| User / mật khẩu | lấy từ `DB_USERNAME` / `DB_PASSWORD` trong `backend/.env` |
| Dữ liệu | Docker volume `roomdecor_pgdata` (tắt máy không mất) |

Compose và backend đọc **cùng một file `.env`**, nên mật khẩu database và mật khẩu backend dùng luôn khớp nhau.

Nếu thiếu `DB_PASSWORD`, compose báo `required variable DB_PASSWORD is missing a value` và không chạy.

## Lệnh hay dùng

Chạy trong thư mục `backend`:

```powershell
docker compose up -d        # bật
docker compose stop         # tắt (giữ container và dữ liệu)
docker compose down         # tắt và xoá container (dữ liệu vẫn còn trong volume)
docker compose down -v      # tắt và XOÁ SẠCH dữ liệu (lần bật sau là database trống)
docker compose logs -f      # xem log (Ctrl+C để thoát)
docker compose exec postgres psql -U roomdecor_app -d roomdecor   # mở giao diện SQL, gõ \q để thoát
```

Container có `restart: unless-stopped`: mở Docker Desktop là database tự bật lại, trừ khi bạn đã `stop`.

## Bảng được tạo như thế nào (Flyway)

Không cần tự tạo bảng. Lần đầu backend khởi động, **Flyway** chạy các file trong
`backend/src/main/resources/db/migration/` theo thứ tự và ghi lại vào bảng `flyway_schema_history`:

| File | Nội dung |
|---|---|
| `V1__init.sql` | `users`, `furniture`, `room_images`, `designs`, `furniture_placements` |
| `V2__add_user_role.sql` | cột `users.role` (`USER` / `ADMIN`) |
| `V3__floor_plans.sql` | bảng `floor_plans` (mặt bằng 2D do AI quét) |

Quy tắc:

- **Không bao giờ sửa file migration đã có.** Flyway lưu checksum từng file: sửa file cũ thì mọi máy đã chạy file đó sẽ báo lỗi `Migration checksum mismatch` và backend không khởi động.
- Muốn thêm/sửa bảng: tạo file mới với số tiếp theo, ví dụ `V4__add_furniture_price.sql`.
- Hibernate để `ddl-auto: validate`: entity Java phải khớp bảng, nếu không backend báo lỗi khi khởi động.

## Xem dữ liệu

Bằng dòng lệnh:

```powershell
docker compose exec postgres psql -U roomdecor_app -d roomdecor -c "SELECT email, role, created_at FROM users;"
docker compose exec postgres psql -U roomdecor_app -d roomdecor -c "SELECT version, description, success FROM flyway_schema_history;"
```

Bằng DBeaver / pgAdmin: Host `localhost`, Port `5433`, Database `roomdecor`, User và Password như trong `backend/.env`.

## Tạo tài khoản ADMIN

Đăng ký tài khoản bình thường (qua app hoặc Swagger), rồi nâng quyền:

```powershell
docker compose exec postgres psql -U roomdecor_app -d roomdecor -c "UPDATE users SET role='ADMIN' WHERE email='admin@example.com';"
```

Đăng nhập lại để lấy token mới có quyền ADMIN. Chi tiết: [api-auth.md](api-auth.md#tạo-tài-khoản-admin).

## Máy đã có container cũ `room-decor-postgres`

Máy nào đã có container `room-decor-postgres` (cũng ở cổng 5433, database `roomdecor`) thì **cứ dùng container đó**,
không chạy `docker compose up`: hai container không thể cùng dùng cổng 5433.

```powershell
docker start room-decor-postgres
```

## Lỗi thường gặp

| Lỗi | Nguyên nhân và cách sửa |
|---|---|
| `Bind for 127.0.0.1:5433 failed: port is already allocated` | Đã có container khác ở cổng 5433 (thường là `room-decor-postgres`). Dùng container đó, hoặc `docker stop room-decor-postgres` rồi `docker compose up -d`. |
| Backend báo `password authentication failed for user "roomdecor_app"` | Mật khẩu chỉ được áp dụng **lần đầu** tạo volume. Đã đổi `DB_PASSWORD` sau đó thì đổi lại cho khớp, hoặc chạy `docker compose down -v` rồi `up -d` (mất dữ liệu). |
| Backend báo `Connection refused` tới `localhost:5433` | Database chưa bật: `docker compose ps`, mở Docker Desktop, `docker compose up -d`. |
| `Migration checksum mismatch` | Có người sửa file migration cũ. Trả file về như cũ và đưa thay đổi sang file `V<số mới>__...sql`. Máy cá nhân có thể `docker compose down -v` để làm lại từ đầu. |
| `error during connect ... docker_engine` | Docker Desktop chưa chạy. Mở Docker Desktop, đợi **Engine running**. |
