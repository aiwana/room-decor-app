# Hướng dẫn đưa bản "frontend sẵn sàng tích hợp API" vào máy (Windows)

Bản sửa được làm trên `master` commit `d503174` (có thư mục `backend/`). Chưa commit, chưa push gì lên GitHub.
Có 2 cách, chọn **một**. Cách 1 an toàn hơn vì Git tự áp đúng từng dòng và tự xoá 2 file cũ.

## 0. Chuẩn bị (bắt buộc)

Mở terminal VS Code trong thư mục dự án:

```bash
git status                 # phải sạch. Nếu có thay đổi chưa commit: commit hoặc stash trước
git pull origin master     # lấy code mới nhất (có backend/)
git checkout -b feature/frontend-api-ready
```

Tắt `npx expo start` nếu đang chạy.

## Cách 1 — Dùng file patch (khuyên dùng)

1. Tải `frontend-api-ready.patch` vào thư mục dự án.
2. Chạy:

```bash
git apply --check frontend-api-ready.patch   # kiểm tra trước, không thay đổi gì
git apply frontend-api-ready.patch
```

Nếu báo lỗi kiểu `patch does not apply` (thường do Windows đổi xuống dòng thành CRLF), thử:

```bash
git apply --ignore-whitespace frontend-api-ready.patch
```

Vẫn lỗi thì dùng Cách 2. Xong thì xoá file `.patch` khỏi thư mục dự án (không commit nó).

## Cách 2 — Chép file từ zip

1. Giải nén `room-decor-app-frontend-api-ready.zip`, mở thư mục `room-decor-app` bên trong.
2. Chép **mọi thứ trong đó** vào thư mục dự án, chọn **Replace**. Zip chỉ chứa file mới và file đã sửa,
   không có `node_modules`, `.git`, `backend/`.
3. Xoá tay 2 file cũ (zip không tự xoá được):
   - `src/services/userService.ts` (chức năng chuyển sang `authService.ts`)
   - `src/data/mock/inspirations.ts` (chuyển sang `src/constants/inspirations.ts`)

## 3. Cài thư viện và chạy

Chạy ở **thư mục gốc** (không phải trong `backend/`), đúng thứ tự:

```bash
npm install            # cài thêm expo-secure-store (lưu token đăng nhập an toàn)
npx expo start -c      # BẮT BUỘC chạy trước typecheck: tạo lại .expo/types cho route mới
                       # (login, register, settings). Thấy mã QR thì Ctrl+C để tắt
npm run typecheck      # phải không có lỗi
npm run lint           # phải không có lỗi
```

Nếu typecheck báo `'/login' is not assignable to parameter of type ...`: xoá thư mục `.expo` (thư mục tạm),
chạy lại `npx expo start -c` rồi typecheck lại.

Kiểm tra backend riêng (không bắt buộc):

```bash
cd backend
npm install
npm run typecheck
npm run dev            # http://localhost:3000/health
```

## 4. Thử nhanh trên Android Emulator

1. Profile → thấy thẻ "Khách" + nút Đăng nhập / Đăng ký.
2. Đăng nhập với email bất kỳ hợp lệ (đang ở chế độ minh họa, có ghi chú trên màn hình).
3. Thoát app, mở lại → vẫn đăng nhập (token lưu bằng SecureStore).
4. Profile → **Cài đặt & kết nối máy chủ** → bật backend (`cd backend && npm run dev`) rồi bấm
   *Kiểm tra kết nối* → phải thấy "Kết nối được backend".
5. Luồng cũ (AI Decor → Result → Lưu → History, Catalog → Chi tiết → Báo giá) vẫn chạy như trước.

## 5. Chuyển sang gọi backend thật (khi backend có API)

Tạo file `.env` ở thư mục gốc (đã nằm trong `.gitignore`):

```
EXPO_PUBLIC_USE_MOCK=false
# Emulator: để trống dòng dưới (tự dùng 10.0.2.2:3000). Điện thoại thật: điền IPv4 máy tính (ipconfig)
# EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

Sau mỗi lần sửa `.env` phải chạy lại `npx expo start -c`. Nếu không có `-c`, app có thể vẫn dùng giá trị cũ
(đã gặp khi kiểm thử).

## 6. Commit (khi bạn đã thử xong)

```bash
git add -A
git commit -m "frontend: API client, auth UI, xu ly loading/loi, tach cau hinh backend"
```
