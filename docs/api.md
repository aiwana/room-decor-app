# Danh sách API

Gốc: `http://localhost:8080` (máy ảo Android: `http://10.0.2.2:8080`). Gọi thử trực tiếp: http://localhost:8080/swagger-ui.html

- **Token:** mọi API (trừ `/api/auth/**` và `/files/**`) cần header `Authorization: Bearer <token>`. Thiếu hoặc sai token thì trả **401**.
- **Lỗi:** mọi lỗi trả cùng dạng `{ timestamp, status, message, errors? }`. Xem [api-auth.md](api-auth.md#4-định-dạng-lỗi-chung).
- **Id:** đều là UUID dạng chuỗi.
- **Quyền sở hữu:** người dùng chỉ đọc/sửa được thiết kế, ảnh, mặt bằng của chính mình. Truy cập của người khác trả **400** kèm `Access denied ...`.

## Tài khoản (chi tiết ở [api-auth.md](api-auth.md))

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | Không cần token | Đăng ký (luôn là USER), trả `{ token, user }` |
| POST | `/api/auth/login` | Không cần token | Đăng nhập, trả `{ token, user }` |
| GET | `/api/users/me` | USER, ADMIN | Tài khoản đang đăng nhập |
| GET | `/api/admin/users` | ADMIN | Danh sách tất cả tài khoản |

## Nội thất

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/furniture?category=sofa` | Danh sách (lọc theo danh mục, không bắt buộc) |
| GET | `/api/furniture/search?q=ghe` | Tìm theo tên |
| GET | `/api/furniture/{id}` | Chi tiết |

`FurnitureDto`: `{ id, name, category, width, height, depth, modelUrl, thumbnailUrl }`, kích thước tính bằng **cm**.
Bảng `furniture` hiện chưa có dữ liệu mẫu (app dùng nội thất mẫu của riêng app).

## Ảnh phòng

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/room-images/upload` | Upload ảnh (multipart, trường `file`, tối đa 50MB) |
| GET | `/api/room-images` | Ảnh của tôi |
| DELETE | `/api/room-images/{id}` | Xoá ảnh (204) |
| GET | `/files/**` | Tải file ảnh theo `url` đã trả về (không cần token) |

Kết quả upload:

```json
{ "id": "8d73d17d-...", "url": "http://localhost:8080/files/rooms/<userId>/<file>.jpg", "width": 1080, "height": 1440, "capturedAt": "2026-10-25T16:11:09Z" }
```

## AI

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/ai/scan-room` | Quét ảnh phòng, tạo (hoặc tạo lại) mặt bằng 2D |
| POST | `/api/ai/suggest-layout` | Gợi ý bố trí nội thất (hiện trả danh sách rỗng) |
| POST | `/api/ai/describe-room/{roomImageId}` | Mô tả phòng (hiện là câu mẫu) |

`POST /api/ai/scan-room`, body:

```json
{
  "roomImageId": "619faa53-...",
  "extraImageIds": ["a1b2...", "c3d4...", "e5f6..."],
  "referenceLengthMeters": 3.2
}
```

- `roomImageId` (bắt buộc): ảnh chính, mặt bằng gắn với ảnh này.
- `extraImageIds` (không bắt buộc, tối đa 5): ảnh phụ của **cùng căn phòng**, ví dụ mỗi góc 1 ảnh, theo thứ tự đi quanh phòng. Tất cả ảnh phải là của người đang đăng nhập; tổng dung lượng tối đa 14 MB.
- `referenceLengthMeters` (không bắt buộc, 0,5 đến 30): chiều dài thật của **bức tường đối diện máy ảnh trong ảnh chính**, để AI căn tỷ lệ.

Kết quả:

```json
{
  "floorPlan": {
    "id": "f444bda4-...",
    "roomImageId": "619faa53-...",
    "extraImageIds": ["a1b2...", "c3d4...", "e5f6..."],
    "roomWidth": 4.0,
    "roomDepth": 4.0,
    "ceilingHeight": 2.7,
    "walls": [ { "x1": 0, "y1": 0, "x2": 4, "y2": 0 }, { "x1": 4, "y1": 0, "x2": 4, "y2": 4 }, "..." ],
    "openings": [ { "type": "door", "x1": 0.5, "y1": 4, "x2": 1.35, "y2": 4 } ],
    "pixelsPerMeter": 100,
    "description": "Mock scan: rectangular room 4.0m x 4.0m with one door, from 1 photo(s) (no API key configured)",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "description": "..."
}
```

- `walls`: các bức tường nối liền thành **đa giác kín** (phòng chữ L, tường xiên... có nhiều hơn 4 bức). Toạ độ theo mét, góc trên trái là (0,0), `roomWidth`/`roomDepth` là hình chữ nhật bao ngoài.
- `openings`: cửa ra vào (`door`) và cửa sổ (`window`), `(x1,y1)`–`(x2,y2)` là hai đầu của nó trên tường.

Không có key AI (`GEMINI_API_KEY` / `OPENAI_API_KEY`) thì luôn trả phòng mẫu 4m x 4m có 1 cửa. Xem [03-chay-backend.md](03-chay-backend.md#6-ai-quét-phòng-ra-mặt-bằng-2d).

## Mặt bằng 2D

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/floor-plans/{id}` | Mặt bằng theo id |
| GET | `/api/floor-plans/by-room-image/{roomImageId}` | Mặt bằng của một ảnh (404 nếu ảnh chưa quét) |
| PUT | `/api/floor-plans/{id}` | Sửa: `{ roomWidth?, roomDepth?, ceilingHeight?, walls?, openings?, pixelsPerMeter? }`, trường nào bỏ trống thì giữ nguyên |

Tọa độ tính bằng **mét**, gốc `(0,0)` ở góc trên trái khi nhìn từ trên xuống; `x` theo chiều rộng, `y` theo chiều sâu.

## Thiết kế

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/designs` | Thiết kế của tôi |
| GET | `/api/designs/{id}` | Chi tiết, kèm `placements` |
| POST | `/api/designs` | Tạo: `{ "name": "Phòng khách", "roomImageId": "..." }` |
| PUT | `/api/designs/{id}` | Đổi tên và/hoặc **thay toàn bộ** danh sách nội thất |
| DELETE | `/api/designs/{id}` | Xoá (204) |

Body `PUT /api/designs/{id}` (bỏ `name` để giữ tên cũ, bỏ `placements` để giữ nội thất cũ):

```json
{
  "name": "Phòng khách mới",
  "placements": [
    { "furnitureId": "882ce1a7-...", "x": 0.5, "y": 0.4, "rotation": 90, "scale": 1 }
  ]
}
```

Ý nghĩa một placement (cách app đang dùng):

| Trường | Ý nghĩa |
|---|---|
| `x`, `y` | Vị trí tâm món đồ theo tỉ lệ `0..1` của khung phòng (trên mặt bằng: `x * roomWidth`, `y * roomDepth` mét) |
| `rotation` | Góc xoay, đơn vị độ, theo chiều kim đồng hồ |
| `scale` | Hệ số phóng to (1 = kích thước thật) |

`furnitureId` phải có trong bảng `furniture`, nếu không trả **404** `Furniture not found`.
