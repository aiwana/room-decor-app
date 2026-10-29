# 5. Cập nhật mới: quét phòng nhiều ảnh, sửa hình phòng, AI gợi ý bố trí, 3D

Đọc file này sau khi `git pull` bản có các tính năng trên. Phần cài đặt chung xem [README.md](README.md).

## 1. Cần làm gì sau khi pull

**Không có thư viện mới**: `package.json` của app và `pom.xml` của backend không đổi, nên **không cần** `npm install` hay tải thêm gì cho Maven. Chỉ cần làm 3 bước:

```powershell
# Cửa sổ 1: backend (Flyway tự chạy V7, V8 khi khởi động)
cd backend
.\mvnw.cmd spring-boot:run

# Cửa sổ 2: app, BẮT BUỘC có -c để xoá cache
cd mobile-app
npx expo start -c
```

Sau đó mở lại app trong Expo Go (vuốt tắt hẳn rồi quét QR lại).

## 2. Database: 2 migration mới

| File | Làm gì |
|---|---|
| `V7__floor_plan_openings_and_extra_images.sql` | Mặt bằng lưu thêm cửa ra vào / cửa sổ và danh sách ảnh góc phòng. |
| `V8__fix_furniture_seed_height_depth.sql` | Sửa số đo 20 món nội thất mẫu nhập ở V5 bị đảo chiều cao và chiều sâu (ví dụ tủ quần áo đang cao 60 cm, sâu 210 cm). Chỉ sửa món còn giữ số cũ của V5. |

Hai file chạy tự động khi backend khởi động, không cần làm tay. Nhắc lại: **không sửa V1 đến V8**, muốn đổi gì thì thêm `V9__...`.

## 3. File `backend/.env`: khoá AI (không bắt buộc)

Không cần biến mới. Tính năng AI dùng các biến đã có trong `.env.example`:

| Biến | Ghi chú |
|---|---|
| `GEMINI_API_KEY` | Khoá lấy ở Google AI Studio. **Để trống vẫn chạy được**: quét phòng trả về phòng mẫu 4 m × 4 m, AI gợi ý bố trí thì backend tự xếp theo luật. |
| `GEMINI_MODEL` | Mặc định `gemini-3.5-flash`. Khoá mới tạo không dùng được `gemini-2.5-flash` (lỗi 404). |
| `GEMINI_THINKING_LEVEL` | Mặc định `low` cho nhanh. |
| `AI_PROVIDER` | Để trống: có khoá Gemini thì dùng Gemini, không có thì dùng bản mẫu. |

Mỗi người tự tạo khoá riêng, **không gửi khoá vào nhóm chat và không commit `.env`**.

## 4. Chạy trên điện thoại thật

Điện thoại và máy tính phải **cùng Wi-Fi**, mạng Wi-Fi trên Windows để chế độ **Private** (Settings > Network > Wi-Fi > Network profile), nếu không tường lửa sẽ chặn cổng 8080.

Lấy IP máy tính bằng `ipconfig` (dòng IPv4 của Wi-Fi), rồi sửa 2 file:

| File | Biến | Ví dụ |
|---|---|---|
| `backend/.env` | `STORAGE_BASE_URL` | `http://192.168.1.20:8080/files` |
| `mobile-app/.env` | `EXPO_PUBLIC_API_URL` | `http://192.168.1.20:8080/api` |
| `mobile-app/.env` | `EXPO_PUBLIC_USE_MOCK` | `false` |

**Mỗi lần đổi mạng** (ở nhà sang ở trường) IP sẽ đổi: sửa lại 2 biến trên, khởi động lại backend, chạy `npx expo start -c`. Thử mở `http://<IP>:8080/swagger-ui.html` bằng trình duyệt trên điện thoại để kiểm tra kết nối.

## 5. Dùng các tính năng mới

### Quét phòng bằng nhiều ảnh (tab "Thiết kế mới")
- Ảnh chính là bắt buộc. Có thể chụp thêm tối đa **5 ảnh góc phòng**, app gợi ý đứng ở đâu để chụp.
- Nhập **chiều dài 1 bức tường** (thước dây) để AI tính kích thước đúng hơn.
- Quét có thể mất 30 đến 90 giây khi gửi nhiều ảnh.

### Sửa hình phòng ("Mặt bằng" > "Sửa phòng")
AI có thể đo sai, người dùng tự sửa lại:
- Kéo các góc (tự bám lưới 5 cm). Chạm vào tường để nhập chiều dài, thêm góc (phòng chữ L), thêm cửa ra vào / cửa sổ.
- Chạm vào góc để xoá góc. Chạm vào cửa để đổi loại, độ rộng, dời vị trí.
- Sửa chiều cao trần. Bấm "Lưu" để cập nhật cả 2D, 3D và báo giá.
- Mặt bằng: 2 ngón để phóng to, nút +/− và nút vừa khung ở góc dưới.

### AI gợi ý bố trí (nút "AI gợi ý")
- Phải quét phòng trước (AI cần hình dạng phòng).
- 2 kiểu: **Sắp xếp lại đồ đang có**, hoặc **Gợi ý thêm đồ từ danh mục** (giữ đồ cũ, thêm vài món còn thiếu).
- Có thể chọn phong cách và ghi chú (ví dụ "chừa lối đi rộng").
- Không có khoá Gemini thì backend tự xếp theo luật, app ghi "(Xếp tự động, AI chưa sẵn sàng.)".
- Không thích kết quả thì bấm **"Hoàn tác"** để quay lại bố trí cũ.

### Xem 3D
- Cần **Internet** lần đầu để tải Three.js.
- Ảnh vân sàn / tường lấy từ backend (`/materials/...`), nên backend phải đang chạy. Nếu không, 3D vẫn hiện nhưng chỉ có màu trơn.
- Kéo 1 ngón để xoay, 2 ngón để phóng to. Tường phía trước tự hạ thấp để nhìn vào phòng.

## 6. Lỗi hay gặp

| Hiện tượng | Cách xử lý |
|---|---|
| App báo lỗi kết nối / API sau khi đổi Wi-Fi | Kiểm tra `EXPO_PUBLIC_API_URL` đúng IP mới, chạy `npx expo start -c`, tắt hẳn Expo Go rồi mở lại. |
| Trình duyệt điện thoại không mở được Swagger | Mạng Windows đang là Public, chuyển sang Private. Kiểm tra backend đang chạy. |
| Quét phòng báo "AI service is busy right now" | Gemini quá tải (lỗi 429/503). Backend đã tự thử lại, chờ 1 phút rồi quét lại. |
| Quét phòng báo lỗi 404 có tên model | Khoá không dùng được model đó, đặt `GEMINI_MODEL=gemini-3.5-flash`. |
| Ảnh phòng không hiện trên điện thoại | `STORAGE_BASE_URL` trong `backend/.env` vẫn là `localhost`, đổi sang IP máy tính rồi khởi động lại backend. |
| 3D hiện "Không tải được 3D" | Điện thoại không có Internet (cần tải Three.js từ CDN). |
| Backend lỗi Flyway "checksum mismatch" | Có người đã sửa file migration cũ. Trả file đó về như trên git, không sửa V1 đến V8. |
