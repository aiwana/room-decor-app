# Bàn giao người 2: Catalog và thiết kế

## Phạm vi

Backend Java 17 / Spring Boot. Không phụ thuộc giao diện mobile hay web.
Mọi API bên dưới cần `Authorization: Bearer <token>` từ Auth API của người 1.
Swagger: `http://localhost:8080/swagger-ui.html`.

## Furniture API

| Method | Đường dẫn | Quyền | Kết quả |
|---|---|---|---|
| GET | `/api/furniture` | USER, ADMIN | Danh sách; `?category=sofa` lọc loại |
| GET | `/api/furniture/search?q=sofa` | USER, ADMIN | Tìm theo tên, không phân biệt hoa thường |
| GET | `/api/furniture/{id}` | USER, ADMIN | Chi tiết |
| POST | `/api/furniture` | ADMIN | Tạo, trả 201 và FurnitureDto |
| PUT | `/api/furniture/{id}` | ADMIN | Thay thông tin, trả 200 và FurnitureDto |
| DELETE | `/api/furniture/{id}` | ADMIN | Xóa, trả 204 |

Body POST/PUT:

```json
{
  "name": "Sofa 2 chỗ",
  "category": "sofa",
  "width": 200,
  "height": 80,
  "depth": 90,
  "modelUrl": "https://example.com/models/sofa.glb",
  "thumbnailUrl": "https://example.com/images/sofa.jpg"
}
```

Tên tối đa 200 ký tự, loại tối đa 100; không được trống. Ba kích thước bắt buộc > 0,
đơn vị **cm**, giữ hợp đồng catalog cũ. Khi dựng scene bằng mét, chia kích thước cho 100.
URL tùy chọn, tối đa 2048 ký tự, nhận HTTP(S) hoặc `/files/...`.
PUT phải gửi đủ tên, loại và kích thước; bỏ URL hoặc gửi null sẽ xóa URL tương ứng.
Đường dẫn minh họa không phải tài nguyên demo thật. Người 5 cung cấp URL model hoạt động.
API chỉ lưu đường dẫn, không tải model hoặc kiểm tra hình học của model.
`/files/**` hiện phục vụ ảnh; nên lưu model GLB/GLTF trên nơi host tài nguyên phù hợp.

FurnitureDto: `{ id, name, category, width, height, depth, modelUrl, thumbnailUrl }`.
Nội thất có tham chiếu trong `furniture_placements` không xóa được, trả 409.
Tham chiếu chỉ nằm bên trong scene JSON không có ràng buộc khóa ngoại; muốn được bảo vệ
khỏi xóa catalog, editor cần đồng thời gửi danh sách `placements`.

## Design API

| Method | Đường dẫn | Kết quả |
|---|---|---|
| GET | `/api/designs` | Danh sách thiết kế của người đăng nhập |
| GET | `/api/designs/{id}` | Tải thiết kế, gồm scene JSON và placements |
| POST | `/api/designs` | Tạo thiết kế, trả 200 (giữ tương thích API cũ) |
| PUT | `/api/designs/{id}` | Cập nhật từng trường, trả 200 |
| DELETE | `/api/designs/{id}` | Xóa thiết kế cùng placements, trả 204 |

Chỉ chủ sở hữu được xem/sửa/xóa, kể cả ADMIN cũng không mở thiết kế người khác.
Không nhận `userId` từ body: backend lấy chủ sở hữu từ JWT.
Nếu tạo thiết kế từ `roomImageId`, ảnh phải thuộc chính người đăng nhập.
Có thể bỏ `roomImageId` để tạo phòng mẫu không dùng ảnh chụp.

Body POST tối thiểu: `{ "name": "Phòng khách" }`.
Ví dụ POST đầy đủ (thay UUID bằng id nội thất thật):

```json
{
  "name": "Phòng khách",
  "previewImageUrl": "https://example.com/previews/living-room.jpg",
  "sceneJson": {
    "version": 1,
    "units": "meters",
    "room": {
      "width": 4,
      "depth": 5,
      "height": 2.7,
      "wallColor": "#F5F0E8",
      "floorColor": "#C9A77D"
    },
    "objects": [
      {
        "instanceId": "sofa-1",
        "furnitureId": "00000000-0000-0000-0000-000000000001",
        "position": { "x": 1, "y": 0, "z": 2 },
        "rotation": { "x": 0, "y": 90, "z": 0 },
        "scale": { "x": 1, "y": 1, "z": 1 }
      }
    ]
  },
  "placements": [
    {
      "furnitureId": "00000000-0000-0000-0000-000000000001",
      "x": 0.25,
      "y": 0.4,
      "rotation": 90,
      "scale": 1
    }
  ]
}
```

Scene phải là **JSON object**, không phải chuỗi JSON hay mảng.
Backend lưu/đọc nguyên cấu trúc bằng PostgreSQL JSONB (không giữ cách xuống dòng/thứ tự khóa).
Schema bên trong là quy ước đề xuất để người 4 tích hợp; backend chưa xác thực từng trường
3D, không tự render hoặc kiểm tra tham chiếu nội thất bên trong scene.
Scene sử dụng trục Y hướng lên, X/Z nằm trên sàn, góc xoay theo độ trong ví dụ này.
Người 4 chịu trách nhiệm chuyển đổi nếu thư viện hiển thị dùng radian.

`placements` giữ hợp đồng 2D cũ: x/y là tỷ lệ vị trí tâm theo chiều rộng/chiều sâu;
rotation tính bằng độ, scale là hệ số > 0. furnitureId phải tồn tại.
Backend không tự đồng bộ scene với placements; editor phải gửi cả hai cùng một lần lưu
nếu sử dụng cả 2D và 3D. Scene là dữ liệu khôi phục đầy đủ của editor.
ID placement gửi lên không dùng để sửa từng phần tử; danh sách được thay toàn bộ.

PUT hỗ trợ `name`, `placements`, `sceneJson`, `previewImageUrl`:

- Trường bỏ qua hoặc null: giữ dữ liệu hiện có.
- `placements: []`: xóa hết đồ bố trí 2D.
- `sceneJson: {}`: thay scene bằng object rỗng.
- `sceneJson` được thay toàn bộ, không gộp các khóa.
- `name` gửi lên phải có nội dung, tối đa 200 ký tự.
- Chưa hỗ trợ xóa riêng preview URL hoặc thay ảnh phòng qua PUT.

DesignDto: `{ id, name, roomImageId, placements, createdAt, updatedAt, sceneJson, previewImageUrl }`.

## Lỗi

| HTTP | Ý nghĩa |
|---|---|
| 400 | Dữ liệu không hợp lệ, scene không phải object, placement không hợp lệ |
| 401 | Thiếu hoặc sai token |
| 403 | Không phải ADMIN khi ghi catalog; không sở hữu thiết kế/ảnh được chọn |
| 404 | Thiết kế, nội thất hoặc ảnh không tồn tại |
| 409 | Xung đột ràng buộc dữ liệu, ví dụ xóa nội thất đang được placements sử dụng |

Định dạng lỗi theo Auth API: `{ timestamp, status, message, errors? }`.

## Database và chạy thử

Giữ nguyên V1–V3. Migration mới `V4__design_scene.sql` bổ sung
`designs.scene_json JSONB` và `designs.preview_image_url VARCHAR(2048)`.
Không cần xóa database; Flyway áp dụng V4 khi backend khởi động.
Sao lưu database trước khi chạy trên môi trường có dữ liệu quan trọng.

Từ thư mục `backend`:

```powershell
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

Thiết lập PostgreSQL và `.env` theo `backend/README.md`.
Tài khoản tự đăng ký có role USER. Để thử ghi catalog, dùng tài khoản ADMIN do người 1
cấp; không mở quyền tự đăng ký ADMIN.

Luồng nghiệm thu trên Swagger:

1. Đăng nhập ADMIN, tạo nội thất bằng POST; lưu id trả về.
2. Đăng nhập USER, tạo thiết kế với sceneJson và furnitureId vừa tạo.
3. GET thiết kế, kiểm tra scene đầy đủ; PUT thay đổi scene, GET kiểm tra lại.
4. Đăng nhập USER khác, thử GET/PUT/DELETE thiết kế: phải trả 403.
5. USER thử thêm/sửa/xóa catalog: phải trả 403.
6. ADMIN xóa nội thất đang nằm trong placements: phải trả 409.
7. Chủ thiết kế xóa thiết kế; ADMIN có thể xóa nội thất sau khi không còn tham chiếu.

Kiểm thử tự động gồm nghiệp vụ, quyền sở hữu, validation lồng nhau và phân quyền HTTP.
Các test dùng mock, không thay thế kiểm thử PostgreSQL thật và trình hiển thị 3D.
