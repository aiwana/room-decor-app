# Tài liệu Room Decor AI: đọc theo thứ tự này

Thành viên mới làm lần lượt từ bước 1. Mỗi file có **kết quả mong đợi**, chỉ đi tiếp khi đã thấy đúng kết quả.

| Bước | File | Bắt buộc? | Làm gì |
| --- | --- | --- | --- |
| 1 | [01-cai-dat-he-thong.md](./01-cai-dat-he-thong.md) | Bắt buộc | Cài Docker, tạo PostgreSQL cho app, chạy backend trong Docker, dựng Jenkins + SonarQube và job `room-decor-ci` |
| 2 | [02-chay-app-mobile.md](./02-chay-app-mobile.md) | Bắt buộc nếu làm app | Cài thư viện Expo, tạo file `.env` ở gốc, nối app với backend, chạy trên Android Emulator |
| 3 | [03-backend-chay-truc-tiep.md](./03-backend-chay-truc-tiep.md) | Tuỳ chọn | Chạy backend bằng `npm run dev` (tự tải lại khi sửa code), dùng chung DB với bước 1 |
| Tra cứu | [api-contract.md](./api-contract.md) | Khi cần | Danh sách endpoint, dữ liệu gửi/nhận, mã lỗi |

## Sau khi cài xong, máy có những gì

| Thành phần | Địa chỉ trên máy | Tạo ở bước |
| --- | --- | --- |
| PostgreSQL của app | `127.0.0.1:5433` | 1 |
| Backend (Docker) | `http://localhost:3001` | 1 |
| SonarQube | `http://localhost:9001` | 1 |
| Jenkins | `http://localhost:8089` | 1 |
| Backend (`npm run dev`) | `http://localhost:3000` | 3 |
| Expo dev server | `http://localhost:8081` | 2 |

## Ba quy tắc chung

1. Không gửi `.env`, mật khẩu, `JWT_SECRET` hay token vào chat, ảnh chụp hoặc commit. Mỗi người tự sinh secret trên máy mình (bước 1, mục 4.1).
2. Luôn `git add` đúng tên file, không dùng `git add .`.
3. Không chạy các lệnh xoá dữ liệu Docker (`down -v`, `volume rm`, `prune`). Danh sách đầy đủ ở bước 1, mục 9.
