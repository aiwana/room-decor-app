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

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/furniture?category=sofa` | USER, ADMIN | Danh sách (lọc theo danh mục, không bắt buộc) |
| GET | `/api/furniture/search?q=ghe` | USER, ADMIN | Tìm theo tên |
| GET | `/api/furniture/{id}` | USER, ADMIN | Chi tiết |
| POST | `/api/admin/furniture` | ADMIN | Thêm đồ vào danh mục, trả 201 + `FurnitureDto` |
| PUT | `/api/admin/furniture/{id}` | ADMIN | Sửa đồ (**thay toàn bộ** các trường, trường bỏ trống thành rỗng/mặc định) |
| DELETE | `/api/admin/furniture/{id}` | ADMIN | Xoá (204). Đồ đang có trong thiết kế đã lưu thì trả **409** |

`FurnitureDto`: `{ id, name, category, width, height, depth, modelUrl, thumbnailUrl, vendorId, vendorName, price, currency, style, material, stockStatus }`, kích thước tính bằng **cm**.
Dữ liệu mẫu có sẵn từ Flyway V4, V5 (đã sửa cao/sâu ở V8).

Body `POST`/`PUT /api/admin/furniture` (bắt buộc `name`, `category`, `width`, `height`, `depth` > 0):

```json
{
  "name": "Ghế đôn tròn", "category": "chair",
  "width": 40, "height": 45, "depth": 40,
  "modelUrl": null, "thumbnailUrl": null,
  "price": 500000, "currency": "VND", "style": "Hiện đại", "material": "Gỗ",
  "stockStatus": "in_stock"
}
```

- `stockStatus`: `in_stock` (mặc định), `out_of_stock` hoặc `preorder`. `currency` mặc định `VND`.
- Nhà cung cấp (`vendor`) không sửa ở đây; sửa đồ thì giữ nguyên nhà cung cấp cũ.
- Lỗi: 400 (dữ liệu sai, có `errors` theo từng trường), 401 (thiếu token), 403 (không phải ADMIN), 404 (không có đồ), 409 (đồ đang được dùng).

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
| POST | `/api/ai/suggest-layout` | AI gợi ý bố trí nội thất theo mặt bằng (xem bên dưới) |
| POST | `/api/ai/describe-room/{roomImageId}` | Mô tả phòng (hiện là câu mẫu) |

`POST /api/ai/scan-room`, body:

```json
{
  "roomImageId": "619faa53-...",
  "extraImageIds": ["a1b2...", "c3d4...", "e5f6..."],
  "roomLengthMeters": 5.1,
  "roomWidthMeters": 3.6,
  "ceilingHeightMeters": 2.7
}
```

- `roomImageId` (bắt buộc): ảnh chính, mặt bằng gắn với ảnh này.
- `extraImageIds` (không bắt buộc, tối đa 5): ảnh phụ của **cùng căn phòng**, ví dụ mỗi góc 1 ảnh, theo thứ tự đi quanh phòng. Tất cả ảnh phải là của người đang đăng nhập; tổng dung lượng tối đa 14 MB.
- `roomLengthMeters`, `roomWidthMeters` (không bắt buộc, 0,5 đến 30): chiều dài (cạnh dài) và chiều rộng (cạnh ngắn) phòng do người dùng đo. Backend **tự kéo giãn mặt bằng** cho khớp: số lớn hơn ứng với cạnh dài hơn của mặt bằng, nên không cần biết hướng chụp. Chỉ gửi 1 trong 2 số thì cả phòng được phóng to/thu nhỏ đều theo số đó.
- `ceilingHeightMeters` (không bắt buộc, 1,8 đến 6): chiều cao trần đo được, dùng thay cho số AI đoán.
- `referenceLengthMeters` (không bắt buộc, 0,5 đến 30, dành cho app bản cũ): chiều dài thật của **bức tường đối diện máy ảnh trong ảnh chính**, chỉ được gửi cho AI để căn tỷ lệ.

Sau khi AI trả lời, backend tự làm gọn mặt bằng (`ScanCorrection`): xoay lại nếu cả phòng bị lệch vài độ, tường lệch dưới 10° thành thẳng/vuông góc, gộp đoạn tường thẳng hàng, bỏ đoạn tường ngắn hơn 20 cm, làm tròn góc phòng theo lưới 5 cm, đưa cửa ra vào / cửa sổ về bức tường gần nhất. Tường xiên rõ ràng (ví dụ góc vát 45°) được giữ nguyên.

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
    "description": "Phòng mẫu hình chữ nhật, có 1 cửa ra vào, quét từ 1 ảnh (chưa cấu hình khoá AI).",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "description": "..."
}
```

- `walls`: các bức tường nối liền thành **đa giác kín** (phòng chữ L, tường xiên... có nhiều hơn 4 bức). Toạ độ theo mét, góc trên trái là (0,0), `roomWidth`/`roomDepth` là hình chữ nhật bao ngoài.
- `openings`: cửa ra vào (`door`) và cửa sổ (`window`), `(x1,y1)`–`(x2,y2)` là hai đầu của nó trên tường.

Không có key AI (`GEMINI_API_KEY` / `OPENAI_API_KEY`) thì luôn trả phòng mẫu 4m x 4m có 1 cửa. Xem [03-chay-backend.md](03-chay-backend.md#6-ai-quét-phòng-ra-mặt-bằng-2d).

`POST /api/ai/suggest-layout` (phòng phải **quét xong** và là của người đang đăng nhập), body:

```json
{
  "roomImageId": "619faa53-...",
  "mode": "rearrange",
  "style": "hiện đại",
  "note": "chừa lối đi rộng",
  "items": [
    { "placementId": "pl-1", "furnitureId": "882ce1a7-...", "name": "Sofa văng", "category": "sofa",
      "width": 210, "depth": 90, "height": 85, "x": 0.5, "y": 0.6, "rotation": 0, "scale": 1 }
  ]
}
```

- `mode`: `rearrange` (mặc định) = AI sắp xếp lại các món trong `items`; `add` = giữ nguyên `items`, AI chọn thêm vài món từ danh mục nội thất.
- `style`, `note` (không bắt buộc): phong cách và mong muốn của người dùng (tối đa 300 ký tự).
- `items` (tối đa 40): đồ đang có trong phòng. Kích thước theo **cm**, `x`/`y` theo tỉ lệ `0..1` như placement. `furnitureId` là chuỗi (app có thể dùng đồ mẫu `sample-...`).

Kết quả:

```json
{
  "placements": [ { "id": "pl-1", "furnitureId": "882ce1a7-...", "x": 0.28, "y": 0.13, "rotation": 0, "scale": 1 } ],
  "newFurniture": [ { "id": "...", "name": "Đèn cây", "category": "lighting", "width": 40, "...": "..." } ],
  "description": "Sofa đặt sát tường dài, bàn trà ở giữa, chừa lối đi trước cửa.",
  "source": "ai"
}
```

- `placements`: toàn bộ bố trí (đồ cũ giữ `id` cũ, đồ mới thêm có `id` bắt đầu bằng `ai-`).
- `newFurniture`: thông tin các món mới thêm từ danh mục (chỉ có ở `add`).
- `source`: `ai` (Gemini) hoặc `rules` (chưa có `GEMINI_API_KEY`, hoặc AI đang bận: backend tự xếp theo luật đơn giản, đồ lớn sát tường, không chắn cửa).
- AI chỉ nhận **mặt bằng và danh sách đồ** (không gửi ảnh). Kết quả luôn được backend kiểm tra lại: bỏ món lạ, đẩy món ra ngoài tường vào trong, không để đồ chắn trước cửa ra vào (0,8 m).

## Mặt bằng 2D

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/floor-plans/{id}` | Mặt bằng theo id |
| GET | `/api/floor-plans/by-room-image/{roomImageId}` | Mặt bằng của một ảnh (404 nếu ảnh chưa quét) |
| PUT | `/api/floor-plans/{id}` | Sửa: `{ roomWidth?, roomDepth?, ceilingHeight?, walls?, openings?, pixelsPerMeter? }`, trường nào bỏ trống thì giữ nguyên |
| POST | `/api/floor-plans/blank` | Phòng trống / phòng mẫu, **không cần ảnh**: `{ roomWidth, roomDepth, ceilingHeight?, walls?, openings?, description? }` (mét). Trả 201 + mặt bằng; `roomImageId` trỏ tới một "ảnh" loại `blank` (không có file) để tạo thiết kế như bình thường. Không gửi `walls` thì phòng là hình chữ nhật |

Mặt bằng và ảnh phòng có thêm trường `source`: `photo` (quét từ ảnh) hoặc `blank` (tự tạo). Gọi `POST /api/ai/scan-room` với ảnh `blank` trả 400 vì không có ảnh để quét; `POST /api/ai/suggest-layout` vẫn dùng được.

Tọa độ tính bằng **mét**, gốc `(0,0)` ở góc trên trái khi nhìn từ trên xuống; `x` theo chiều rộng, `y` theo chiều sâu.

## Thiết kế

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/designs` | Thiết kế của tôi |
| GET | `/api/designs/{id}` | Chi tiết, kèm `placements` |
| POST | `/api/designs` | Tạo: `{ "name": "Phòng khách", "roomImageId": "...", "roomType": "living" }` (`roomType` không bắt buộc, mặc định `other`) |
| PUT | `/api/designs/{id}` | Đổi tên, đổi loại phòng và/hoặc **thay toàn bộ** danh sách nội thất |
| DELETE | `/api/designs/{id}` | Xoá (204) |

Chỉ chủ thiết kế mới đọc, sửa, xoá được: thiết kế của người khác trả **403**. Khi tạo thiết kế, `roomImageId` phải là ảnh phòng của chính mình (ảnh của người khác cũng trả 403).

`roomType` (từ V10) nhận một trong các giá trị `living`, `bedroom`, `kitchen`, `dining`, `office`, `kids`, `bathroom`, `other`. Giá trị khác trả **400**. Thiết kế cũ có sẵn `other`. App bản 1.0 không gửi trường này nên vẫn chạy bình thường.

Body `PUT /api/designs/{id}` (bỏ `name` để giữ tên cũ, bỏ `roomType` để giữ loại cũ, bỏ `placements` để giữ nội thất cũ):

```json
{
  "name": "Phòng khách mới",
  "roomType": "living",
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
