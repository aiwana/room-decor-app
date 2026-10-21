# Tài liệu tích hợp AI tạo ảnh — Room Decor App

Ngày: 2026-10-21 · Giai đoạn 1: AI tạo ảnh thực tế

## 1. Bảng so sánh phương án đã xét (mục "phương án kỹ thuật" cho báo cáo)

| Phương án | Cơ chế | Chi phí | Khả năng giữ ảnh gốc | Kết luận |
|---|---|---|---|---|
| A. Toán client-side (như dự án VLXD cũ) |Kéo 4 điểm neo, warp texture | 0đ, offline | ✅ áp lên ảnh gốc | ❌ Không đổi được nội thất — chỉ phủ bề mặt |
| B. AI text-to-image server (Pollinations Classic) | Gửi prompt từ lựa chọn người dùng → AI vẽ phòng mới | **0đ** (đã kiểm chứng) | ⚠️ Ảnh gốc giữ vai trò "Trước"; ảnh AI là phòng mẫu cùng loại/phong cách | ✅ **CHỌN cho giai đoạn 1** |
| C. AI image-to-image (Gemini Nano Banana / FLUX Kontext) | Gửi ảnh gốc + prompt → AI vẽ đè giữ bố cục | Gemini: free tier = 0 (429 limit 0); Pollinations edit: cần key; HF: token free, không ổn định (Space trả error khi quá tải — đã test) | ✅ "Phòng của chính bạn" | ⏳ Đường nâng cấp — kiến trúc adapter đã sẵn sàng |
| D. AR Realtime | ARCore/ARKit | — | — | ❌ Không phù hợp "tái thiết kế" |

Điểm kiến trúc: `backend/src/ai/aiProvider.ts` là hợp đồng chung; mỗi nhà cung cấp 1 file
(`pollinationsProvider.ts`, sau này `geminiProvider.ts`…). Đổi provider chỉ sửa `AI_PROVIDER`
trong `backend/.env` — phần còn lại của hệ thống không thay đổi.

## 2. Kiến trúc bất đồng bộ

```
App ── multipart (ảnh + roomType/style/colorTheme/prompt) ──► POST /api/designs
                                                               │ validate (zod) + lưu ảnh gốc + INSERT designs status='processing'
                                                               │ buildInteriorPrompt() → hàng đợi worker
                                                               ▼
                                                     Trả 202 {Design, status:'processing'}  (~1 giây)
App cứ 3s polling GET /api/designs/:id                        │
      ▲                                                       ▼
      │                            worker gọi Pollinations (retry khi 402/429/503, giới hạn MAX_AI_JOB_WAIT_MS)
      │                                                       │ thành công: lưu ảnh vào UPLOAD_DIR, url ký số 30 ngày
      └── status='done' + resultImageUrl ◄─────────UPDATE designs ┘
          hoặc 'failed' + errorMessage(kèm JWT; lỗi JSON tiếng Việt)
```

Vòng đời `status`: `processing` → `done` | `failed` (kèm `errorMessage`)

## 3. Giới hạn free Pollinations (đã ghi nhận khi test)

| Giới hạn | Giá trị | Cách hệ thống xử lý |
|---|---|---|
| Số ảnh | 1 ảnh / cách nhau ≥45s / mỗi IP | worker retry 40 giây/lần, tối đa 4 lần trong 5 phút |
| Service bận | HTTP 503 "at its limit" | cùng cơ chế retry như trên |
| Kích thước ảnh | ≤768×768px (đang dùng 768×576, tỷ lệ 4:3) | — |
| Ảnh có logo nhỏ | góc phải dưới | chấp nhận (bản free), có thể dùng pollinations key khi muốn |
| Mô hình | 1 model duy nhất (anonymous) | — |

## 4. Bảng kiểm chứng đã chạy (10/2026)

| # | Yêu cầu | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|
| 1 | bedroom + japandi + beige | ✅ HTTP 200, ảnh đẹp đúng phong cách | 8–9s | Lần đầu gặp 503, retry sau 60s thành công |
| 2 | living + industrial + gray | ✅ HTTP 200, ảnh đúng phong cách | 9,5s | Gồm tối 50s cooldown nội bộ vỉ token |
| 3 | Gemini text model (key thật của dự án) | ✅ HTTP 200 | 2,2s | Key hoạt động — chỉ thiếu hạn mức model ảnh |
| 4 | Gemini 4 model ảnh (nano-banana-2.1, 2.5-flash-image, 3.1-*) | ❌ 429 limit=0 free tier | — | Chính sách Google 10–2026 |
| 5 | Pollinations `/v1/images/edits` (image-to-image) | ❌ 401 cần key | — | Tính năng edit cần key |
| 6 | HF Gradio Space Qwen-Image-Edit | ❌ error khi cao điểm | — | ZeroGPU quá tải; Space = RUNNING nhưng không ổn định để demo |

## 5. Cách chạy thử hệ thống (khi có PostgreSQL)

```bash
# 1) backend
cd backend
npm install
npm run dev          # http://localhost:3000/health phải báo ok

# 2) Kiểm tra nhanh AI không cần DB (độc lập):
node backend/scripts/e2e-ai-flow.mjs        # sinh 2 ảnh test khảo sát prompt + provider

# 3) app Expo:
#    .env gốc: EXPO_PUBLIC_USE_MOCK=false (+ EXPO_PUBLIC_API_URL khi chạy máy thật)
npx expo start -c
#    Đăng nhập/đăng ký → AI Decor → chọn ảnh + phong cách → Generate
#    → 10–20s sau thấy ảnh "done" trong Result; lưu → History.
```

Lỗi có thể gặp khi test:

| Hiện tượng | Nguyên nhân | Xử lý |
|---|---|---|
| Ảnh mất ~50s mới xong | worker đang chờ slot 45s/IP (bấm tạo 2 lần liên tiếp) | chờ — UI báo "AI đang thiết kế lại phòng của bạn" |
| "Dịch vụ AI đang quá tải" | 503 kéo dài hoặc quá 5 phút retry, thiết kế đánh dấu 'failed' | Bấm "Thiết kế lại" retry — không mất ảnh gốc |
| Đợi hết POLL_MAX_TOTAL_MS | Pollinations quá chậm | Báo "Thời gian tạo quá lâu…" — xem lại trong Lịch sử sau ~1 phút |

## 6. Điều người dùng thấy (kịch bản demo)

1. AI Decor → chọn ảnh phòng (camera/thư viện) + loại phòng/phong cách/màu + mô tả → "✨ Generate"
2. Overlay "AI đang tạo thiết kế" (đơn giản, kiểm tra loading lo数据处理)
3. Sau ~10–20s → Result: Before/After slider (ảnh gốc ↔ ảnh AI), thông tin phong cách, sản phẩm gợi ý
4. Bấm Lưu → History; bấm Yêu thích; Thiết kế lại; Chia sẻ — đầy đủ như trước
5. Nếu AI tạm quá tải → Result hiện lỗi tiếng Việt + nút Thử lại; ảnh gốc không mất

## 7. Bảo mật

- Pollinations không có key → app/backend không chứa secret AI nào giai đoạn này
- Khi nâng cấp provider có key (Gemini/HF/…): key đặt trong `backend/.env` (gitignored), config kiểm
  chặt "provider chọn = có key" khi khởi động (zod superRefine); không bao giờ đặt vào `EXPO_PUBLIC_*`
- Upload ảnh nhân người dùng đã thẩm: type/size kín trong `multer` (giữ nguyên)
- URL ảnh là ký số HMAC hết hạn 30 ngày (giữ nguyên)
