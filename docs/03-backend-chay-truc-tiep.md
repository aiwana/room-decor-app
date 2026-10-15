# Bước 3 (tuỳ chọn). Chạy backend trực tiếp bằng `npm run dev`

Dùng khi đang **sửa code backend**: `npm run dev` tự tải lại mỗi khi lưu file, không phải build lại image Docker.

Làm sau [Bước 1](./01-cai-dat-he-thong.md). Bản dev dùng **chung PostgreSQL** với backend Docker (container `room-decor-postgres`, cổng `127.0.0.1:5433`), nên dữ liệu hai bên là một.

---

## 1. Kiểm tra `backend\.env`

File này đã được tạo ở bước 1, mục 4.1 (khối lệnh thứ 3). Kiểm tra **tên biến** mà không in giá trị bí mật:

```powershell
Get-Content backend\.env | % { ($_ -split '=',2)[0] }
git check-ignore -v backend\.env
```

Kết quả mong đợi: có đủ `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`, `PGSSL`; lệnh thứ hai in ra một dòng `.gitignore:...`.

Nếu chưa có file: chạy lại khối lệnh ở bước 1, mục 4.1, **hoặc** chép mẫu rồi tự điền:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Với DB của bước 1, `DATABASE_URL` có dạng `postgresql://roomdecor_app:<mật khẩu DB>@127.0.0.1:5433/room_decor` (mật khẩu nằm trong `$HOME\.room-decor\postgres.env`). `JWT_SECRET` phải dài ít nhất 32 ký tự, nếu không backend từ chối khởi động. Tạo nhanh một giá trị:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

## 2. Cài thư viện và chạy

```powershell
cd backend
npm ci
npm run typecheck
npm run dev
```

Khi khởi động, backend kết nối PostgreSQL, tự tạo bảng nếu chưa có, thêm dữ liệu mẫu (7 danh mục, 18 sản phẩm; chạy lại nhiều lần không bị trùng), rồi lắng nghe ở cổng `3000`.

Ở một cửa sổ PowerShell khác:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Kết quả mong đợi: `status : ok`. Endpoint này truy vấn DB, nên `ok` nghĩa là đã kết nối được PostgreSQL.

Muốn app gọi bản dev: đổi `EXPO_PUBLIC_API_URL` trong `.env` gốc sang cổng `3000` (bảng ở [Bước 2](./02-chay-app-mobile.md#2-tạo-file-env-ở-gốc-dự-án)), rồi `npx expo start -c`.

Ảnh upload từ bản dev ghi vào `backend\storage\uploads`, cùng thư mục mà backend Docker mount, nên hai bản thấy cùng ảnh. Thư mục này đã nằm trong `.gitignore`; đừng xoá nó nếu cần giữ ảnh.

## 3. Build như production (tuỳ chọn)

```powershell
cd backend
npm ci
npm run build
npm start
```

`npm run build` biên dịch `src` sang `dist`, `npm start` chạy `dist/server.js`. Đây cũng là những gì Dockerfile làm bên trong image.

## PostgreSQL ngoài Docker hoặc trên cloud

Nếu không dùng container của bước 1, tạo database và tài khoản riêng (trong `psql` bằng tài khoản quản trị):

```sql
CREATE ROLE roomdecor_app LOGIN PASSWORD 'thay-bang-mat-khau-manh';
CREATE DATABASE room_decor OWNER roomdecor_app;
```

Rồi sửa `DATABASE_URL` cho đúng host/port. Nếu mật khẩu có ký tự đặc biệt (`@ : / # %`), phải URL-encode trong `DATABASE_URL`. Dịch vụ cloud yêu cầu SSL thì đặt `PGSSL=true` và thêm `?sslmode=require`; không tắt xác minh chứng chỉ để lách lỗi.

---

## Lỗi thường gặp

| Dấu hiệu | Cách xử lý |
| --- | --- |
| Log `Invalid backend environment`, backend dừng ngay | Thiếu biến hoặc `JWT_SECRET` < 32 ký tự trong `backend\.env` |
| `ECONNREFUSED 127.0.0.1:5433` | Container DB tắt: `docker start room-decor-postgres` |
| `password authentication failed` | Mật khẩu trong `DATABASE_URL` khác với `$HOME\.room-decor\postgres.env` |
| `EADDRINUSE :::3000` | Đã có một `npm run dev` khác đang chạy; tắt nó (Ctrl+C) rồi chạy lại |
| `/health` không trả `ok` | Xem lỗi trong cửa sổ đang chạy `npm run dev` |
