# Hướng dẫn cập nhật code vào dự án (Windows)

## 1. Sao lưu trước (bắt buộc)

Mở terminal VS Code trong `C:\Users\TANBINHGAS\Desktop\room-decor-app`:

```bash
git add -A
git commit -m "backup truoc khi cap nhat frontend"
git checkout -b feature/frontend-mock
```

Nếu có gì sai, quay lại bằng `git checkout main`.

## 2. Chép code mới

1. Tắt `npx expo start` nếu đang chạy.
2. Trong thư mục dự án, **xoá thư mục `src`** cũ (code cũ vẫn nằm trong git, không mất).
3. Giải nén file zip, mở thư mục `room-decor-app` bên trong, chép **mọi thứ trong đó** vào thư mục dự án, chọn **Replace** khi được hỏi.
   Zip không có `node_modules`, `.git`, `.expo`, nên không đè lên những thứ đó.
4. Xoá các file cũ không dùng nữa (zip không tự xoá được):
   - `scripts/reset-project.js`
   - `assets/images/react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png`
   - `assets/images/tutorial-web.png`, `expo-badge.png`, `expo-badge-white.png`, `expo-logo.png`, `logo-glow.png`
   - thư mục `assets/images/tabIcons/`

## 3. Cài thư viện mới và chạy

```bash
npm install
npx expo start -c
```

`npm install` sẽ cài thêm `expo-image-picker` (camera/thư viện ảnh), `eslint`, `eslint-config-expo`.
Cờ `-c` xoá cache vì đã đổi tên route.

## 4. Kiểm tra

```bash
npm run typecheck
npm run lint
```

Cả hai phải không có lỗi. Sau đó `git add -A` và `git commit -m "frontend: AI Decor, Result, History, Catalog (mock)"`.

## 5. Test trên Android Emulator

- Camera trên emulator là camera ảo. Để thử "Chọn ảnh", kéo-thả vài ảnh phòng từ máy tính vào cửa sổ emulator.
- Lần đầu chọn ảnh, app sẽ xin quyền. Nếu bấm "Từ chối", app hiện nút mở Cài đặt.
- Ảnh mẫu (picsum.photos) là ảnh ngẫu nhiên, không phải ảnh phòng thật. Đổi trong `src/constants/decorOptions.ts`, `src/data/mock/*.ts` và `src/services/aiService.ts`.

## Danh sách thay đổi chính

| Mục | Thay đổi |
|---|---|
| Navigation | Tabs: Home / AI Decor / History / Profile. `simulate.tsx` → `ai-decor.tsx`, `quote.tsx` → `history.tsx` |
| Màn mới | AI Decor, Result, History, Profile, Catalog, Product Detail, Quote Request (modal), 404 |
| Màu | `COLORS` chuyển từ `screens/HomeScreen/styles.ts` sang `constants/colors.ts` |
| Types | Tách `types/index.ts` thành `common`, `design`, `product`, `user` (vẫn import từ `@/types`) |
| Mock | `data/mockData.ts` → `data/mock/` (8 sản phẩm cũ giữ nguyên + 10 sản phẩm mới) |
| Component | `ProductCard` chỉ còn sản phẩm (chuyển vào `components/catalog/`); phần "Dự án" thành `InspirationCard`; `QuickActionItem` chuyển vào `components/home/` |
| Service | Mới: `aiService`, `designService`, `productService`, `quoteService`, `userService`, `apiClient` |
| Lưu trữ | Thiết kế đã lưu và sản phẩm yêu thích lưu bằng AsyncStorage |
| Đã bỏ | Tab Quote, Quick Action "Tồn kho", file mẫu Expo không dùng (`themed-*`, `use-theme`, `theme.ts`, `global.css`, `reset-project.js`) |
| Cấu hình | `app.json` thêm plugin `expo-image-picker` (câu xin quyền tiếng Việt); thêm `eslint.config.js`, `.env.example`, script `typecheck` |
