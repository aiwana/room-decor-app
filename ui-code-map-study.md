# RoomDecor — Bản đồ UI → Code Chi Tiết

> Mỗi nút, mỗi màn hình: tên hiển thị → file → số dòng → hàm được gọi.  
> Phạm vi: Tạo thiết kế mới (Phòng trống, Phòng mẫu, Ảnh phòng) + Thiết kế của tôi.

---

## SƠ ĐỒ ĐIỀU HƯỚNG

```
Tab "Tạo mới"  →  app/(main)/(tabs)/new-design.tsx
  ├── mode = 'photo'    →  ImagePickerBox + form chụp ảnh
  ├── mode = 'blank'    →  BlankRoomForm mode='blank'
  └── mode = 'template' →  BlankRoomForm mode='template'
                              └── Nút "Kéo chỉnh" → app/(main)/room-shape.tsx
                                                   → RoomShapeEditor.tsx

Tab "Của tôi"  →  app/(main)/(tabs)/designs.tsx
  └── DesignCard → bấm → /editor/[id]
                → "..." → DesignActionsSheet (đổi tên / loại / nhân bản / xoá)
```

---

## PHẦN 1 — MÀN HÌNH "THIẾT KẾ MỚI"

**File:** `mobile-app/app/(main)/(tabs)/new-design.tsx`  
**Tổng:** ~455 dòng

---

### 1.1 Hằng số & kiểu dữ liệu quan trọng

| Tên | Dòng | Giá trị / Kiểu | Ý nghĩa |
|-----|------|----------------|---------|
| `NAME_MAX` | 36 | `200` | Giới hạn ký tự tên thiết kế (khớp DB) |
| `SIDE_MIN` / `SIDE_MAX` | 40–41 | `0.5` / `30` | Giới hạn số đo phòng (mét) |
| `CEILING_MIN` / `CEILING_MAX` | 42–43 | `1.8` / `6` | Giới hạn chiều cao trần |
| `SCAN_GUIDE_SEEN_KEY` | 46 | `'roomdecor.scanGuideSeen'` | Key AsyncStorage lưu "đã xem hướng dẫn" |
| `CreateMode` | 83–84 | `'photo' \| 'blank' \| 'template'` | Kiểu chế độ tạo |
| `Step` | 79 | `'idle' \| 'uploading' \| 'creating' \| 'scanning'` | Bước đang xử lý |
| `CREATE_MODES` | 85–89 | mảng 3 phần tử | Tab chọn chế độ (icon + label) |

---

### 1.2 State

| Biến | Dòng | Kiểu | Ý nghĩa |
|------|------|------|---------|
| `mode` | ~125 | `CreateMode` | Chế độ đang chọn, khởi tạo từ `params.start` |
| `image` | ~130 | `PickedImage \| null` | Ảnh phòng chính |
| `extraImages` | ~131 | `PickedImage[]` | Ảnh góc bổ sung (tối đa `MAX_EXTRA_ROOM_IMAGES`) |
| `measures` | ~132 | `Record<MeasureKey, string>` | Số đo chiều dài / rộng / trần (không bắt buộc) |
| `measureErrors` | ~133 | `Partial<Record<MeasureKey, string>>` | Lỗi validation từng ô |
| `measureOpen` | ~134 | `boolean` | Accordion "Đo thêm" có mở không |
| `guideOpen` | ~135 | `boolean` | Modal hướng dẫn chụp ảnh |
| `name` | ~137 | `string` | Tên thiết kế |
| `nameError` | ~138 | `string \| undefined` | Lỗi validation tên |
| `roomType` | ~139 | `RoomType` | Loại phòng |
| `step` | ~140 | `Step` | Bước xử lý hiện tại |
| `error` | ~143 | `string \| null` | Lỗi API hiển thị cho user |
| `busyRef` | ~144 | `useRef<boolean>` | Chống double-submit |

---

### 1.3 Các nút — chế độ Ảnh phòng (mode = 'photo')

#### Thanh chọn chế độ (3 tab)
| Tab | Dòng render | Hàm khi bấm |
|-----|-------------|-------------|
| "Ảnh phòng" | ~364–376 | `setMode('photo')` + `haptic.select()` |
| "Phòng trống" | ~364–376 | `setMode('blank')` + `haptic.select()` |
| "Phòng mẫu" | ~364–376 | `setMode('template')` + `haptic.select()` |

**Code (dòng ~364):**
```tsx
{CREATE_MODES.map((m) => (
  <Pressable onPress={() => { haptic.select(); setMode(m.id); }}>
    <Ionicons name={m.icon} />
    <Text>{m.label}</Text>
  </Pressable>
))}
```

---

#### Hộp chọn ảnh (ImagePickerBox)
| Nút | Dòng | Hàm khi bấm |
|-----|------|-------------|
| "Chụp ảnh" | ~379 | `pick('camera')` → `pickFromCamera()` → `setImage(picked)` |
| "Chọn từ thư viện" | ~379 | `pick('gallery')` → `pickFromGallery()` → `setImage(picked)` |
| Nút xoá ảnh (X) | ~379 | `reset()` → xoá image + extraImages + measures + name |

---

#### Link "Cách chụp cho chính xác"
| Dòng | Hàm khi bấm |
|------|-------------|
| ~393–399 | `setGuideOpen(true)` → mở `ScanGuideSheet` |

**Tự động mở lần đầu:** `useEffect` dòng ~167 — nếu chưa có key `SCAN_GUIDE_SEEN_KEY` trong AsyncStorage và mode = 'photo' thì tự mở.

---

#### Ảnh góc phòng bổ sung (CornerPhotosPicker)
Chỉ hiện khi đã có ảnh chính (`image !== null`).

| Nút | Dòng | Hàm khi bấm |
|-----|------|-------------|
| Thêm ảnh góc (camera) | ~403 | `pickCorner('camera')` → `corner.pickFromCamera()` → `setExtraImages(prev => [...prev, picked])` |
| Thêm ảnh góc (gallery) | ~403 | `pickCorner('gallery')` → `corner.pickFromGallery()` |
| Xoá ảnh góc (X) | ~403 | `removeCorner(index)` → `setExtraImages(prev => prev.filter((_, i) => i !== index))` |
| Giới hạn | — | `MAX_EXTRA_ROOM_IMAGES` (hằng số từ `@/constants`) |

---

#### Accordion "Đo thêm cho chính xác hơn"
| Nút / Vùng | Dòng | Hàm khi bấm |
|------------|------|-------------|
| Header (mở/đóng) | ~410–420 | `setMeasureOpen((v) => !v)` |
| Ô "Chiều dài (m)" | ~427 | `setMeasure('length')(text)` → `setMeasures({...prev, length: text})` |
| Ô "Chiều rộng (m)" | ~436 | `setMeasure('width')(text)` |
| Ô "Chiều cao trần (m)" | ~445 | `setMeasure('ceiling')(text)` |

**Lưu ý:** Các số đo này được truyền vào `floorPlanApi.scan()` để `ScanCorrection` backend scale mặt bằng AI.

---

#### Phần cuối — đặt tên + nút Tạo
| Phần tử | Dòng | Hàm khi bấm |
|---------|------|-------------|
| Ô "Tên thiết kế" | ~456 | `setName(text)` |
| `RoomTypePicker` | ~466 | `setRoomType(type)` |
| **Button "Tạo thiết kế"** | ~470–475 | `void handleCreate()` |

---

### 1.4 Luồng `handleCreate()` — chế độ Ảnh phòng

**Dòng:** ~246–295

```
1. Guard busyRef + validate name (không rỗng, ≤ 200 ký tự)
        │
2. Validate measures (nếu nhập): SIDE_MIN ≤ value ≤ SIDE_MAX
        │
3. Nếu có ảnh góc: kiểm tra tổng dung lượng < MAX_SCAN_IMAGES_BYTES (13MB)
        │
4. setStep('uploading')
   roomImageApi.upload(image.uri)          → POST /api/room-images/upload
   for each extraImage: roomImageApi.upload → POST /api/room-images/upload (tuần tự)
        │
5. setStep('creating')
   designApi.create({ name, roomImageId, roomImageUri, roomType })
                                           → POST /api/designs
        │
6. setStep('scanning')
   floorPlanApi.scan(roomImageId, { extraImageIds, roomLengthMeters, roomWidthMeters, ceilingHeightMeters })
                                           → POST /api/ai/scan-room
   [Lỗi quét không block: lưu scanError, vẫn chuyển màn hình]
        │
7. reset() + router.push('/editor/' + design.id)
   Nếu có scanError → Alert.alert('AI chưa quét được phòng', ...)
```

---

## PHẦN 2 — PHÒNG TRỐNG & PHÒNG MẪU

**File:** `mobile-app/src/components/design/BlankRoomForm.tsx`  
Được nhúng vào `new-design.tsx` dòng ~378: `<BlankRoomForm key={mode} mode={mode} />`

---

### 2.1 Hằng số & helper functions

| Tên | Dòng | Ý nghĩa |
|-----|------|---------|
| `NAME_MAX` | 50 | 200 ký tự tên thiết kế |
| `PREVIEW_HEIGHT` | 51 | 200px — chiều cao khối xem trước mặt bằng |
| `PREVIEW_PADDING` | 52 | 24px — lề để ghi số đo bên ngoài tường |
| `THUMB_W` / `THUMB_H` | 53–54 | 56×40px — kích thước hình thu nhỏ hình dạng |
| `sizesOf(def)` | 59–63 | Khởi tạo sizes từ defaultWidth/Depth của shape def |
| `parseMeters(text)` | 65–68 | "3,5" hoặc "3.5" → 3.5; sai → NaN |
| `fmt(v)` | 70 | Format số theo locale vi-VN (dấu phẩy) |
| `shapeArea(shape)` | 73–77 | Shoelace formula → diện tích m² |
| `buildShape(def, sizes)` | 80–95 | Validate 3 ô nhập → `shapeRoom()` hoặc danh sách lỗi |
| `previewPlan(shape)` | 98–107 | Tạo FloorPlan tạm để render `FloorPlanBackground` |

---

### 2.2 State

| Biến | Dòng | Kiểu | Ý nghĩa |
|------|------|------|---------|
| `shapeId` | ~207 | `string` | Hình dạng đang chọn (blank), mặc định `'rect'` |
| `sizes` | ~208 | `{width, depth, ceiling: string}` | Giá trị 3 ô nhập kích thước |
| `showErrors` | ~209 | `boolean` | Hiện lỗi sau khi blur ô nhập |
| `templateId` | ~210 | `string` | Phòng mẫu đang chọn, mặc định `'bedroom'` |
| `custom` | ~212 | `RoomShape \| null` | Hình người dùng đã kéo chỉnh (ghi đè shape tính từ sizes) |
| `name` | ~213 | `string` | Tên thiết kế |
| `pickedType` | ~215 | `RoomType \| null` | Loại phòng tự chọn; null = dùng gợi ý |
| `busy` | ~216 | `boolean` | Đang gọi API |
| `error` | ~217 | `string \| null` | Lỗi API |
| `previewWidth` | ~218 | `number` | Chiều rộng layout của khối preview |

**Logic tính shape (~dòng 221–232):**
```typescript
const shapeDef = ROOM_SHAPES.find(d.id === shapeId) ?? ROOM_SHAPES[0]
const template = ROOM_TEMPLATES.find(t.id === templateId) ?? ROOM_TEMPLATES[0]
const built    = useMemo(() => buildShape(shapeDef, sizes), [shapeDef, sizes])
const baseShape = mode === 'template' ? template.shape : built.shape
const shape    = custom ?? baseShape   // custom ghi đè tất cả
```

---

### 2.3 Chế độ Phòng trống (mode = 'blank') — 3 bước

#### Bước 1: Chọn hình dạng

| Nút | Dòng | Hàm khi bấm |
|-----|------|-------------|
| Tile "Chữ nhật" | ~267–282 | `chooseShape(def)` |
| Tile "Vuông" | ~267–282 | `chooseShape(def)` |
| Tile "Hẹp dài" | ~267–282 | `chooseShape(def)` |
| Tile "Chữ L" | ~267–282 | `chooseShape(def)` |
| Tile "Chữ L ngược" | ~267–282 | `chooseShape(def)` |
| Tile "Chữ U" | ~267–282 | `chooseShape(def)` |
| Tile "Chữ T" | ~267–282 | `chooseShape(def)` |
| Tile "Vát góc" | ~267–282 | `chooseShape(def)` |
| Tile "Có hốc tường" | ~267–282 | `chooseShape(def)` |

**`chooseShape(def)` (~dòng 240–244):**
```typescript
setShapeId(def.id)
setSizes(sizesOf(def))   // reset kích thước về default của hình đó
setCustom(null)          // xoá hình đã kéo chỉnh
setShowErrors(false)
```

**Dữ liệu hình dạng** từ `ROOM_SHAPES` trong `room-templates.ts` (dòng 82–101):

| id | Tên | Số đỉnh | Kích thước mặc định |
|----|-----|---------|---------------------|
| `rect` | Chữ nhật | 4 | 4 × 3.5 m |
| `square` | Vuông | 4 | 4 × 4 m |
| `narrow` | Hẹp dài | 4 | 6 × 2.4 m |
| `l-right` | Chữ L | 6 | 5 × 4 m |
| `l-left` | Chữ L ngược | 6 | 5 × 4 m |
| `u` | Chữ U | 8 | 5 × 4 m |
| `t` | Chữ T | 8 | 6 × 5 m |
| `chamfer` | Vát góc | 5 | 4.5 × 4 m |
| `alcove` | Có hốc tường | 8 | 5 × 4 m |

---

#### Bước 2: Kích thước

| Phần tử | Dòng | Hàm khi thay đổi |
|---------|------|-----------------|
| Ô "Dài (m)" | ~300–310 | `setSize('width')(text)` → `setSizes({...prev, width: text})` |
| Ô "Rộng (m)" | ~312–322 | `setSize('depth')(text)` |
| Ô "Trần (m)" | ~324–334 | `setSize('ceiling')(text)` |
| Khối xem trước (Pressable) | ~172–190 | `openEditor()` |
| **"Kéo chỉnh trên hình"** | ~300–308 | `openEditor()` |
| **"Kéo chỉnh tiếp"** (khi đã có custom) | ~300–308 | `openEditor()` |
| **"Hoàn tác"** (khi đã có custom) | ~310–320 | `setCustom(null)` |

**`openEditor()` (~dòng 244–248):**
```typescript
openRoomShapeEditor(router, {
  floorPlan: previewPlan(shape),
  onSave: saveCustom          // callback nhận RoomShapeResult
})
// → router.push('/room-shape')
// → RoomShapeEditor mở toàn màn hình
```

**`saveCustom()` (~dòng 250–257):**
```typescript
// Nhận kết quả từ RoomShapeEditor, lưu vào custom state
setCustom({ roomWidth, roomDepth, ceilingHeight, walls, openings })
// Từ đây shape = custom (ghi đè sizes + shapeDef)
```

**Validation trong `buildShape()` (~dòng 80–95):**
```
width  ∈ [ROOM_SIDE_MIN=1.5, ROOM_SIDE_MAX=30] → errors.width
depth  ∈ [1.5, 30]                             → errors.depth
ceiling ∈ [CEILING_MIN=1.8, CEILING_MAX=6]     → errors.ceiling
```

---

#### Bước 3: Đặt tên & loại phòng

| Phần tử | Dòng | Hàm khi thay đổi |
|---------|------|-----------------|
| Ô tên thiết kế | ~345–352 | `setName(text)` |
| `RoomTypePicker` | ~354 | `setPickedType(type)` |
| **Button "Tạo thiết kế"** | ~372–376 | `void handleCreate()` |

---

### 2.4 Chế độ Phòng mẫu (mode = 'template') — 3 bước

#### Bước 1: Chọn phòng mẫu

| Phòng mẫu | Dòng | Kích thước | Hàm khi bấm |
|-----------|------|-----------|-------------|
| Row "Phòng ngủ" | ~328–351 | 3×4m, trần 2.7m, 1 cửa sổ | `chooseTemplate(t)` |
| Row "Phòng khách" | ~328–351 | 5×4m, trần 2.8m, 1 cửa sổ lớn | `chooseTemplate(t)` |
| Row "Bếp" | ~328–351 | 2.5×3.5m, trần 2.7m, 1 cửa sổ | `chooseTemplate(t)` |
| Row "Phòng làm việc" | ~328–351 | 3×3m, trần 2.7m, 1 cửa sổ | `chooseTemplate(t)` |
| Row "Căn studio" | ~328–351 | 6×4m, trần 2.8m, 2 cửa sổ | `chooseTemplate(t)` |

**`chooseTemplate(t)` (~dòng 246–250):**
```typescript
setTemplateId(t.id)
setCustom(null)        // reset hình đã kéo chỉnh
setPickedType(null)    // reset loại phòng về gợi ý của template
```

**Dữ liệu template** từ `ROOM_TEMPLATES` trong `room-templates.ts` (dòng 134–155). Tất cả dùng `rectangleRoom()`.

**Loại phòng gợi ý tự động** (dòng ~235–237 BlankRoomForm):
```typescript
const TEMPLATE_ROOM_TYPE = { bedroom: 'bedroom', living: 'living', kitchen: 'kitchen', office: 'office' }
roomType = pickedType ?? TEMPLATE_ROOM_TYPE[template.id] ?? DEFAULT_ROOM_TYPE
```

---

#### Bước 2: Xem trước (cùng `previewBlock` với blank)

| Nút | Hàm khi bấm |
|-----|-------------|
| Khối xem trước | `openEditor()` → RoomShapeEditor |
| "Kéo chỉnh trên hình" | `openEditor()` |
| "Kéo chỉnh tiếp" / "Hoàn tác" | xem §2.3 |

---

### 2.5 Luồng `handleCreate()` — Phòng trống / Mẫu

**Dòng:** ~258–275 (BlankRoomForm)

```
1. Guard busyRef + kiểm tra shape tồn tại (kích thước hợp lệ)
        │
2. floorPlanApi.createBlank(shape)
        → POST /api/floor-plans/blank
        { roomWidth, roomDepth, ceilingHeight, walls, openings }
        ← { id, roomImageId, ... }
        │
3. designApi.create({ name: name||defaultName, roomImageId: plan.roomImageId, roomType })
        → POST /api/designs
        ← Design { id, ... }
        │
4. router.push('/editor/' + design.id)
```

---

## PHẦN 3 — DỮ LIỆU HÌNH DẠNG (room-templates.ts)

**File:** `mobile-app/src/constants/room-templates.ts`  
**Tổng:** ~155 dòng

### 3.1 Hằng số

| Tên | Dòng | Giá trị |
|-----|------|---------|
| `DEFAULT_CEILING` | 32 | 2.7 m |
| `DOOR_WIDTH` | 34 | 0.9 m |
| `DOOR_OFFSET` | 35 | 0.4 m (khoảng cách từ góc tường đến cửa) |
| `ROOM_SIDE_MIN` | 38 | 1.5 m |
| `ROOM_SIDE_MAX` | 39 | 30 m |
| `CEILING_MIN` | 40 | 1.8 m |
| `CEILING_MAX` | 41 | 6 m |

### 3.2 Các hàm tạo hình học

| Hàm | Dòng | Mô tả |
|-----|------|-------|
| `r2(v)` | 43 | Làm tròn 2 chữ số thập phân |
| `polygonWalls(pts)` | 45–48 | Mảng điểm `[x,y][]` → `Wall[]` theo chiều kim đồng hồ |
| `doorBottom(depth)` | 51–56 | Cửa ra vào ở tường dưới cùng, từ x=0.4 đến x=1.3 |
| `windowTop(x1,x2)` | 59 | Cửa sổ ở tường trên cùng (y=0) |
| `rectangleRoom(w,d,h,windows)` | 62–73 | Phòng chữ nhật + 1 cửa ra vào + cửa sổ tùy chọn |
| `autoDoor(pts)` | 103–118 | Tự đặt cửa vào tường ngang thấp nhất & dài nhất |
| `shapeRoom(def,w,d,h)` | 121–131 | Nhân `def.points × [w,d]` → Wall[] + tự gắn cửa |

### 3.3 `ROOM_SHAPES` (dòng 82–101)

Mảng 9 `RoomShapeDef`. Mỗi phần tử:
- `id`: định danh
- `name`: tên hiển thị
- `points`: đa giác tỉ lệ 0–1 (nhân với width/depth để ra mét)
- `defaultWidth` / `defaultDepth`: kích thước mặc định khi chọn

### 3.4 `ROOM_TEMPLATES` (dòng 134–155)

Mảng 5 `RoomTemplate`. Mỗi phần tử:
- `id`, `name`, `icon`: hiển thị trong danh sách
- `summary`: 1 dòng mô tả (kích thước + số cửa)
- `shape`: `RoomShape` được tạo bởi `rectangleRoom()`

---

## PHẦN 4 — MÀN HÌNH "THIẾT KẾ CỦA TÔI"

**File:** `mobile-app/app/(main)/(tabs)/designs.tsx`  
**Tổng:** ~510 dòng

---

### 4.1 Kiểu dữ liệu

| Kiểu | Dòng | Giá trị | Ý nghĩa |
|------|------|---------|---------|
| `SortKey` | 42 | `'updated' \| 'created' \| 'name' \| 'area'` | Cách sắp xếp |
| `SourceFilter` | 43 | `'all' \| 'photo' \| 'blank'` | Lọc theo nguồn |
| `ViewKind` | 44 | `'grid' \| 'list'` | Kiểu hiển thị |
| `SORTS` | 46–51 | mảng 4 | Option sắp xếp trong Modal |
| `SOURCES` | 53–57 | mảng 3 | Option lọc nguồn |

---

### 4.2 State

| Biến | Dòng | Kiểu | Ý nghĩa |
|------|------|------|---------|
| `hiddenId` | ~115 | `string \| null` | ID tạm ẩn khi đang xóa (optimistic) |
| `query` | ~116 | `string` | Chuỗi tìm kiếm |
| `sort` | ~117 | `SortKey` | Tiêu chí sắp xếp, mặc định `'updated'` |
| `source` | ~118 | `SourceFilter` | Lọc nguồn, mặc định `'all'` |
| `roomType` | ~119 | `RoomType \| 'all'` | Lọc loại phòng |
| `view` | ~120 | `ViewKind` | Kiểu hiển thị, lưu AsyncStorage |
| `sortOpen` | ~121 | `boolean` | Modal "Sắp xếp & lọc" |
| `actionsFor` | ~122 | `DesignDetail \| null` | Thiết kế đang hiện `DesignActionsSheet` |
| `pulling` | ~125 | `boolean` | Chỉ hiện spinner khi kéo tay |

**Dữ liệu thiết kế** từ `useDesigns()` hook (~dòng 112) → gọi `designApi.list()` → `GET /api/designs`.

---

### 4.3 Header màn hình

| Phần tử | Dòng | Hàm khi bấm |
|---------|------|-------------|
| Tiêu đề "Thiết kế của tôi" | ~304 | — (chỉ hiển thị) |
| Số đếm (ví dụ "12 thiết kế") | ~305 | — |
| Icon grid/list (toggle) | ~308–316 | `toggleView()` |

**`toggleView()` (~dòng 148–153):**
```typescript
haptic.select()
const next = view === 'grid' ? 'list' : 'grid'
setView(next)
savePrefs({ view: next, sort })   // lưu AsyncStorage
```

---

### 4.4 Thanh toolbar (renderToolbar)

| Phần tử | Dòng | Hàm khi bấm |
|---------|------|-------------|
| Ô tìm kiếm | ~196–207 | `setQuery(text)` |
| Icon X (xoá tìm kiếm) | ~208–210 | `setQuery('')` |
| Icon "options-outline" (Sắp xếp & lọc) | ~212–221 | `setSortOpen(true)` |
| Badge đỏ trên icon (số filter đang bật) | ~222–226 | — (chỉ hiển thị) |
| Chip "Tất cả" | ~229–237 | `setRoomType('all')` + `haptic.select()` |
| Chip loại phòng (Phòng ngủ, v.v.) | ~229–237 | `setRoomType(t.id)` + `haptic.select()` |

**Chip loại phòng** chỉ hiện khi có ≥2 loại phòng khác nhau trong danh sách (dòng ~226).

---

### 4.5 Modal "Sắp xếp & lọc"

| Phần tử | Dòng | Hàm khi bấm |
|---------|------|-------------|
| Backdrop (vùng tối) | ~321 | `setSortOpen(false)` |
| Icon X (đóng) | ~325 | `setSortOpen(false)` |
| Option "Mới sửa gần đây" | ~328–337 | `chooseSort('updated')` |
| Option "Mới tạo gần đây" | ~328–337 | `chooseSort('created')` |
| Option "Tên A → Z" | ~328–337 | `chooseSort('name')` |
| Option "Diện tích lớn → nhỏ" | ~328–337 | `chooseSort('area')` |
| Segment "Tất cả" (nguồn) | ~340–352 | `setSource('all')` |
| Segment "Từ ảnh chụp" | ~340–352 | `setSource('photo')` |
| Segment "Phòng trống / mẫu" | ~340–352 | `setSource('blank')` |
| **Button "Xong"** | ~354–358 | `setSortOpen(false)` |

**`chooseSort(next)` (~dòng 155–158):**
```typescript
setSort(next)
savePrefs({ view, sort: next })   // lưu AsyncStorage STORAGE_KEYS.DESIGNS_VIEW
```

---

### 4.6 Thẻ thiết kế (DesignCard)

**File:** `mobile-app/src/components/design/DesignCard.tsx`

| Thao tác | Hàm được gọi |
|----------|-------------|
| Bấm vào thẻ | `openDesign(design)` → `router.push('/editor/[id]')` |
| Bấm "..." (more) | `setActionsFor(design)` → mở `DesignActionsSheet` |
| Nhấn giữ thẻ | `setActionsFor(design)` (cùng kết quả) |

---

### 4.7 DesignActionsSheet

Mở khi `actionsFor !== null`. Nhận các callback từ `DesignsScreen`.

| Nút trong sheet | Hàm được gọi | API |
|----------------|-------------|-----|
| "Mở" | `openDesign(design)` | — (chỉ navigate) |
| "Đổi tên" | `rename(design, newName)` | `PUT /api/designs/{id}` |
| "Đổi loại phòng" | `changeType(design, type)` | `PUT /api/designs/{id}` |
| "Tạo phương án B" | `duplicate(design)` | `POST /api/designs` (copy) |
| "Xoá" | `confirmDelete(design)` | `DELETE /api/designs/{id}` |

**`duplicate()` (~dòng 189–200):**
```typescript
const copy = await designApi.duplicate(design, `${design.name} (phương án B)`)
refresh()
Alert.alert('Đã tạo phương án mới', ..., [
  { text: 'Để sau' },
  { text: 'Mở ngay', onPress: () => openDesign(copy) }
])
```

**`confirmDelete()` (~dòng 202–215):**
```typescript
setActionsFor(null)
Alert.alert('Xoá thiết kế?', ..., [
  { text: 'Huỷ' },
  { text: 'Xoá', onPress: () => {
    setHiddenId(design.id)        // ẩn ngay (optimistic)
    designApi.remove(design.id)
      .then(refresh)
      .finally(() => setHiddenId(null))
  }}
])
```

---

### 4.8 Màn hình rỗng (EmptyView)

Hiển thị khi `visible.length === 0` (chưa có thiết kế nào).

| Nút | Dòng | Hàm khi bấm |
|-----|------|-------------|
| **"Tạo thiết kế mới"** | ~270 | `router.navigate('/new-design')` |

---

### 4.9 Logic lọc + sắp xếp

**Pipeline `filtered` (~dòng 160–170):**
```typescript
visible
  .filter(d => normalize(d.name).includes(normalize(query)))  // tìm kiếm không phân biệt dấu
  .filter(d => roomType === 'all' || roomTypeInfo(d.roomType).id === roomType)
  .filter(d => source === 'all' || sourceOf(d) === source)
  .sort(compareBy(sort))
```

**Nhóm theo ngày (`sections`) (~dòng 172–185):**
```typescript
// Chỉ nhóm khi sort là 'updated' hoặc 'created'
// Nhãn: 'Hôm nay' | 'Tuần này' | 'Trước đó'  (hàm dayGroup dòng 68–74)
```

**`sourceOf(d)` (~dòng 60–65):**
```typescript
if (d.summary?.source) return d.summary.source  // 'photo' hoặc 'blank'
if (d.roomImageUri === '') return 'blank'         // phòng trống
return d.roomImageUri ? 'photo' : null            // null = chưa biết
```

**`normalize(s)` (~dòng 90–96):**
```typescript
// Bỏ dấu tiếng Việt: "Phòng khách" → "phong khach"
// Cho phép tìm "phong khach" ra "Phòng khách"
s.normalize('NFD').replace(diacritics, '').replace('đ','d').toLowerCase().trim()
```

---

## PHẦN 5 — CÁC FILE LIÊN QUAN KHÁC

| File | Dòng quan trọng | Chức năng |
|------|----------------|-----------|
| `mobile-app/src/services/floor-plan-api.ts` | `createBlank()` ~dòng 85 | `POST /api/floor-plans/blank` |
| `mobile-app/src/services/design-api.ts` | `create()` ~dòng 65 | `POST /api/designs` |
| `mobile-app/src/services/room-image-api.ts` | `upload()` ~dòng 22 | `POST /api/room-images/upload` (multipart) |
| `mobile-app/src/hooks/useDesigns.ts` | toàn bộ | `GET /api/designs` → danh sách thiết kế |
| `mobile-app/src/components/design/DesignCard.tsx` | toàn bộ | Thẻ hiển thị thiết kế trong lưới/danh sách |
| `mobile-app/src/components/design/DesignActionsSheet.tsx` | toàn bộ | Sheet thao tác (đổi tên, nhân bản, xoá) |
| `mobile-app/src/store/room-shape-session.ts` | `openRoomShapeEditor()` | Truyền dữ liệu sang màn hình Sửa phòng |
| `mobile-app/app/(main)/room-shape.tsx` | toàn bộ | Wrapper màn hình RoomShapeEditor |
