# API contract (tài liệu tra cứu)

Backend hiện triển khai các endpoint dưới đây trong `backend/src/routes.ts`. Dữ liệu nghiệp vụ lưu trong PostgreSQL.

## Quy ước chung

| Mục | Quy ước |
|---|---|
| Base URL | Backend Docker: `http://localhost:3001`. Backend `npm run dev`: `http://localhost:3000`. API nghiệp vụ có tiền tố `/api` |
| Định dạng | JSON, tên trường camelCase |
| ID | Chuỗi (UUID cho user, design và quote; ID danh mục/sản phẩm dạng chuỗi) |
| Ngày giờ | ISO 8601 |
| Tiền | Số nguyên VND |
| Xác thực | `Authorization: Bearer <token>`; JWT hết hạn sau 7 ngày |
| Lỗi | `{ "message": "...", "errors": { "field": "..." } }` khi có lỗi theo trường |
| CORS | Cho phép các origin trong `CORS_ORIGINS` |

Không có refresh token hoặc endpoint logout phía server; client xoá token khi đăng xuất. API sản phẩm và gửi yêu cầu báo giá không yêu cầu đăng nhập. API thiết kế yêu cầu JWT hợp lệ.

## Health

| Method | Path | Response |
|---|---|---|
| GET | `/health` | `200 { "status": "ok", "message": "Room Decor AI backend is running" }`; truy vấn PostgreSQL để xác nhận backend sẵn sàng |

## Xác thực

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | `201 { token, user }`; `409` nếu email đã có |
| POST | `/api/auth/login` | `{ email, password }` | `200 { token, user }`; `401` nếu thông tin sai |
| GET | `/api/me` | Bearer token | `200 user`; `401` nếu phiên không hợp lệ |

`user` = `{ id, name, email, avatarUrl? }`. Mật khẩu tối thiểu 6 ký tự và được băm bằng bcrypt. Email được chuẩn hoá chữ thường.

## Danh mục và sản phẩm (không cần đăng nhập)

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/api/categories` | — | `[{ id, label }]` |
| GET | `/api/products` | `category?`, `ids?` (`a,b,c`), `featured?` (`true`) | `[Product]` |
| GET | `/api/products/:id` | — | `Product`; `404` nếu không tồn tại |

`Product` = `{ id, name, brand, price, unit, categoryId, categoryName, imageUrl, rating, reviewCount, description, specs: [{label, value}], colors: [string], sizes: [string] }`. Giá là số nguyên VND. Danh mục và 18 sản phẩm mẫu được seed idempotently khi server khởi động. Danh sách chưa phân trang; `ids` nhận tối đa 100 sản phẩm.

## Thiết kế và lịch sử (cần đăng nhập)

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/designs` | multipart: `image` (file), `roomType`, `style`, `colorTheme?`, `prompt?` | `201 Design` |
| GET | `/api/designs` | — | `[Design]` đã lưu, mới nhất trước |
| GET | `/api/designs/:id` | — | `Design` của người dùng hiện tại |
| POST | `/api/designs/:id/save` | — | `204` |
| DELETE | `/api/designs/:id` | — | `204` |
| POST / DELETE | `/api/designs/:id/favorite` | — | `204` |

`Design` = `{ id, createdAt, originalImageUri, resultImageUrl, roomType, style, colorTheme?, prompt?, status, errorMessage?, products: [{ productId, usage }], isFavorite }`. Ảnh gốc được lưu trong `UPLOAD_DIR`; `originalImageUri` là URL ký số chỉ đọc được trong 30 ngày. Mặc định giới hạn upload 10 MiB, nhận JPEG/PNG/WebP/HEIC. Bản hiện tại trả `status: "done"` ngay và dùng ảnh minh hoạ cho kết quả; chưa tích hợp AI thật. Danh sách chỉ gồm thiết kế đã lưu, còn endpoint lấy theo ID cũng đọc được bản nháp của chính người dùng.

## Báo giá (không cần đăng nhập)

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/quote-requests` | `{ productId, customerName, phone, quantity, note? }` | `201 { id, createdAt }` |

`quantity` là số nguyên dương; `phone` gồm 10 số và bắt đầu bằng `0`. `productId` phải tồn tại.

## Sản phẩm yêu thích

Yêu thích sản phẩm hiện chỉ được lưu cục bộ bởi frontend; API chưa đồng bộ danh sách này. Yêu thích thiết kế được lưu trong PostgreSQL theo tài khoản.

## Mã lỗi

`400` dữ liệu không hợp lệ, `401` chưa xác thực, `404` không tìm thấy, `409` email trùng, `413` ảnh quá lớn, `415` định dạng ảnh không hỗ trợ, `500` lỗi server.
