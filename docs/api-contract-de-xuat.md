# API contract — ĐỀ XUẤT (chưa thống nhất)

> Trạng thái 09/10/2026: backend **chỉ có** `GET /health`. Mọi endpoint còn lại trong file này là **đề xuất của frontend**,
> chưa được triển khai. Người làm backend sửa trực tiếp file này khi đồng ý/không đồng ý, frontend sẽ sửa theo
> (chỉ cần sửa `src/services/endpoints.ts`, `src/services/validators.ts` và `src/types/`).

## Quy ước chung (đề xuất)

| Mục | Đề xuất | Vì sao |
|---|---|---|
| Base URL | `http://<host>:3000`, các API nghiệp vụ có tiền tố `/api` | Cổng 3000 lấy từ `backend/src/server.ts` |
| Định dạng | JSON, tên trường **camelCase** | Trùng type frontend trong `src/types/` |
| id | chuỗi (`"12"` hoặc UUID) | Frontend coi mọi id là `string` |
| Ngày giờ | ISO 8601, ví dụ `"2026-10-09T08:00:00.000Z"` | |
| Tiền | số nguyên VND | |
| Xác thực | Header `Authorization: Bearer <token>` | Đã cài sẵn trong `apiClient.ts`, đổi 1 chỗ nếu khác |
| Lỗi | HTTP status + body `{ "message": "...", "errors": { "field": "..." } }` | `apiError.ts` đọc `message` để hiện cho người dùng, `errors` để hiện dưới từng ô |
| CORS | Bật cho bản web khi phát triển | Chỉ cần nếu chạy app trên trình duyệt |

Mã lỗi frontend đang xử lý riêng: `400/422` (dữ liệu sai), `401` (chưa đăng nhập/token hết hạn → app tự đăng xuất),
`403`, `404`, `409` (trùng, ví dụ email đã đăng ký), `413` (ảnh quá lớn), `5xx`.

## Đã có

| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{ "status": "ok", "message": "Room Decor AI backend is running" }` |

## Đề xuất

### Xác thực

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | `201 { token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | `200 { token, user }` · `401` sai email/mật khẩu |
| GET | `/api/me` | (Bearer) | `200 user` · `401` |

`user` = `{ id, name, email, avatarUrl? }`. Mật khẩu tối thiểu 6 ký tự (frontend đang kiểm tra như vậy).
Cần hỏi: token loại gì, hết hạn sau bao lâu, có refresh token không, có cần `POST /api/auth/logout` không.
Nếu tên trường khác (`accessToken`...), frontend chỉ sửa `isAuthSession` trong `validators.ts`.

### Danh mục & sản phẩm (không cần đăng nhập)

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/api/categories` | | `[{ id, label }]` |
| GET | `/api/products` | `category?`, `ids?` (`a,b,c`), `featured?` (`true`) | `[Product]` |
| GET | `/api/products/:id` | | `Product` · `404` |

`Product` = `{ id, name, brand, price, unit, categoryId, categoryName?, imageUrl, rating, reviewCount, description, specs: [{label, value}], colors: [string], sizes: [string] }`.
Icon danh mục do frontend chọn, backend không cần trả. Cần hỏi: có phân trang không (`page`, `limit`, tổng số).

### Thiết kế & lịch sử (cần đăng nhập)

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/designs` | multipart: `image` (file), `roomType`, `style`, `colorTheme?`, `prompt?` | `201 Design` |
| GET | `/api/designs` | | `[Design]` (đã lưu, mới nhất trước) |
| GET | `/api/designs/:id` | | `Design` |
| POST | `/api/designs/:id/save` | | `204` |
| DELETE | `/api/designs/:id` | | `204` |
| POST / DELETE | `/api/designs/:id/favorite` | | `204` |

`Design` = `{ id, createdAt, originalImageUri, resultImageUrl, roomType, style, colorTheme?, prompt?, status: "processing"|"done"|"failed", errorMessage?, products: [{ productId, usage }], isFavorite }`.
`originalImageUri` phải là URL ảnh trên server (không phải đường dẫn file trong điện thoại).
Giai đoạn này AI vẫn là ảnh minh họa phía backend. Cần hỏi: giới hạn dung lượng/định dạng ảnh; trả `done` ngay hay
`processing` rồi frontend gọi lại `GET /api/designs/:id` (màn Result đã có nút "Kiểm tra lại").

### Báo giá

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/quote-requests` | `{ productId, customerName, phone, quantity, note? }` | `201` |

`quantity` là số nguyên > 0, `phone` 10 số bắt đầu bằng 0 (frontend đang kiểm tra như vậy). Cần hỏi: có cần đăng nhập không.

### Sản phẩm yêu thích

Hiện **chỉ lưu trên máy**. Nếu backend muốn lưu theo tài khoản, đề xuất `GET /api/favorites/products`,
`POST / DELETE /api/favorites/products/:productId`.
