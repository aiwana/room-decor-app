# Bàn giao dự án RoomDecor

Cập nhật: 2026-10-28, sau demo.

## 1. Sản phẩm và hướng đi

- App: ảnh phòng trống → AI đo sơ bộ → mặt bằng 2D → dựng 3D vỏ phòng → thêm nội thất/vật liệu → lưu/chia sẻ.
- Stack: Expo SDK 52 + React Native + TypeScript; Spring Boot 3.4 + PostgreSQL + Flyway; Gemini Vision.
- Không tái tạo nội thất có sẵn trong ảnh; không có thư viện phòng mẫu.
- Định hướng kinh doanh: **B2B2C** — shop nội thất trả tiền, B2C dùng link 3D miễn phí làm phễu. Pilot 1 shop trước.
- 3D hiện dùng WebView + Three.js, chưa cần R3F native.

## 2. Trạng thái hiện tại

- Backend: `http://localhost:8082`, Swagger `/swagger-ui.html`.
- PostgreSQL Docker `roomdecor-db`, healthy, cổng 5433.
- Metro: cổng **8084**.
- PC IP: `192.168.41.102` (đổi theo mạng).
- Điện thoại test gần nhất: Samsung SM-G988U1, Android 13, Expo Go **2.32.19** (SDK 52).
- ADB lúc bàn giao: **chưa thấy thiết bị**; cần bật Wireless debugging/pair lại.
- `mobile-app/.env`:
  ```env
  EXPO_PUBLIC_USE_MOCK=false
  EXPO_PUBLIC_API_URL=http://127.0.0.1:8082/api
  ```
  (dùng `adb reverse` vì Wi-Fi/firewall chặn 8082).
- `backend/.env`: `AI_PROVIDER=gemini`, `GEMINI_API_KEY` đã điền, `GEMINI_MODEL=gemini-2.5-flash`. Không đọc/in key, không commit `.env`.

## 3. Lệnh chạy

### Backend

```powershell
cd C:\Users\Admin\room-decor-app\backend
docker compose up -d
$env:JAVA_HOME = "C:\Program Files\JetBrains\PyCharm 2025.2.1.1\jbr"
$env:SERVER_PORT = "8082"
$env:STORAGE_BASE_URL = "http://192.168.41.102:8082/files"
.\mvnw.cmd spring-boot:run
```

JDK 21 bắt buộc; JDK 24 làm Lombok lỗi.

### Metro

```powershell
cd C:\Users\Admin\room-decor-app\mobile-app
npx expo start --host lan --port 8084
```

Nếu dùng ADB:

```powershell
adb reverse tcp:8082 tcp:8082
adb reverse tcp:8084 tcp:8084
```

Mở `exp://127.0.0.1:8084` trong Expo Go.

### Tài khoản test

- `e2e-test@example.com`
- `test123456`

## 4. Đã làm

- Backend: sửa upload path absolute; V4 thêm vật liệu design + seed 13 furniture; API lưu/trả vật liệu; Gemini client base64; chọn provider qua `AI_PROVIDER`; fallback mock.
- Mobile: types/local-store/design-api vật liệu; material picker; 2D/3D nhận màu; kéo thả đã sửa bằng cách bỏ ScrollView và chọn item khi thả.
- Vừa sửa:
  - thanh Xoay/Nhỏ/To/Xoá chuyển ra ngoài vùng body, cố định trên toolbar để không bị cắt;
  - text Settings cập nhật “Lưu trên máy và máy chủ khi bấm Lưu”; hint localhost + adb reverse.
- Đã test thật: login, Home, chọn ảnh thật, tạo design, Gemini scan (8.5×5.0 m, trần 3.2 m), 2D, thêm/kéo nội thất, đổi vật liệu, lưu/mở lại, 3D, ảnh phòng, AI gợi ý mẫu, My Designs/xoá, catalog/lọc/chi tiết, Profile/Settings/connection.
- `npm run typecheck`: pass.

## 5. Lỗi/TODO

1. Thanh công cụ đã chuyển ra ngoài body nhưng **chưa test lại trên máy thật** (ADB đang mất kết nối).
2. Editor vẫn không scroll; nội dung dưới frame có thể bị cắt. Cần layout/scroll đúng cách, giữ drag.
3. 3D mới là box + màu; chưa load GLB/texture. `model_url` đã seed cho 2 ghế nhưng chưa dùng.
4. Chưa có nhập/chỉnh kích thước phòng, cửa/cửa sổ, kiểm tra va chạm/vừa phòng.
5. Bảo mật B2B còn thiếu: `/files/**` public, CORS `*` + credentials, chưa rate limit/quota/tenant isolation/audit, JWT chưa refresh.
6. Chưa up SDK 57/dev client/EAS.
7. Chưa commit trước bản này; sau commit cần tag demo.

## 6. Roadmap v1.0

- Fix editor layout/scroll, test drag + thanh công cụ.
- Nhập/chỉnh kích thước phòng sau AI scan.
- Cửa/cửa sổ + sửa tường 2D.
- Catalog thật: GLB + texture + giá + shop.
- Kiểm tra vừa phòng/va chạm.
- Share link 2D/3D + PDF báo giá.
- Auth: quên mật khẩu, refresh token.
- SDK 57 + dev client/EAS.
- Test backend Testcontainers, mobile Maestro/Detox; CI GitHub Actions.

## 7. B2B2C pilot

- Chọn 1 shop quen, nhập 20–50 món + giá.
- Làm link 3D + báo giá PDF.
- Dùng thử 5–10 buổi tư vấn.
- Giá test: setup 2–5 triệu; subscription 1,5–3 triệu/tháng; model 3D 300–600k/món.
- Có shop trả tiền mới làm admin web/multi-tenant/branding/CRM.

## 8. Bảo mật trước pilot

- HTTPS, S3 private, signed URL, strip EXIF.
- `shop_id` + role owner/admin/sale/viewer.
- Rate limit/quota scan, audit log.
- AI gói trả phí không train dữ liệu; key chỉ backend.
- Privacy policy, xoá dữ liệu; tham chiếu Nghị định 13/2023/NĐ-CP.

## 9. Nguyên tắc làm việc

- Tiếng Việt, ngắn, checklist + ví dụ số.
- Chốt ý tưởng rồi làm; test E2E thật.
- Không lộ key/token; không chỉnh cài đặt không liên quan.
- Khi user tự nhập trên điện thoại, dừng automation.
- Trước demo: đóng băng feature, có mock/video dự phòng.

## 10. Prompt cho context mới

```text
Đọc docs/HANDOFF.md và docs/README.md. Tiếp tục RoomDecor.
Giữ Expo/RN + Spring Boot + PostgreSQL + Gemini; B2B2C.
Việc trước mắt:
1. Kết nối lại điện thoại ADB/adb reverse; kiểm tra backend 8082, DB, Metro 8084.
2. Test thanh công cụ editor (đã chuyển ra ngoài body) và kéo thả; sửa layout/scroll nếu còn cắt.
3. Commit/tag bản demo nếu chưa.
4. Làm v1.0: nhập kích thước phòng, catalog GLB/texture/giá, share/PDF, rồi pilot 1 shop.
Không đọc/in key backend/.env; không commit .env.
```
