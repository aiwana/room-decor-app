# RoomDecor — Mặt Bằng, Hình Học & Trình Chỉnh Sửa

> **Mục đích:** Tài liệu học tập toàn diện về floor plan, geometry layers, editor 2D/3D, kéo thả nội thất, sửa phòng và hoàn tác.
> **Phiên bản:** v1.2.0 | Backend: Java 17 + Spring Boot 3.4 | Frontend: TypeScript + React Native (Expo SDK 52)

---

## Sơ đồ kiến trúc tổng thể

```
[Ảnh phòng]
     │
     ▼
RoomVisionClient (AI: Gemini / OpenAI / Mock)
     │  RoomAnalysisResult { walls, openings, width, depth, ceiling }
     ▼
FloorPlanGeometry.normalize()   ← Làm sạch dữ liệu AI, dịch về (0,0)
     │
     ▼
ScanCorrection.apply()          ← Khử nghiêng, vuông góc, scale, snap 5cm
     │
     ▼
FloorPlanService → FloorPlan (DB)
     │
     ▼  GET /api/floor-plans/by-room-image/{id}
mobile-app / room-geometry.ts   ← Hình học phía client
     │
     ├─► FloorPlanBackground.tsx   (SVG mặt bằng 2D)
     ├─► PlacedItem.tsx            (kéo / xoay / phóng to nội thất)
     ├─► View3D.tsx                (Three.js trong WebView)
     ├─► RoomShapeEditor.tsx       (sửa tường, cửa, góc)
     └─► useUndoHistory.ts         (hoàn tác / làm lại)
```

---

## Hệ tọa độ dùng xuyên suốt

```
(0,0) ──────────────► x  (roomWidth, mét)
  │
  │
  ▼
  y  (roomDepth, mét)

Gốc tọa độ : góc trên-trái phòng
Đơn vị     : MÉT, làm tròn đến cm (2 chữ số thập phân)
Chiều y    : tăng xuống dưới (top-down view)
```

Tọa độ nội thất trên editor lưu theo **tỉ lệ 0..1** (chia cho roomWidth/roomDepth) để dùng được trên mọi kích thước màn hình.

---

## PHẦN 1 — MẶT BẰNG & HÌNH HỌC BACKEND

### 1.1 Entity: WallSegment & Opening

```java
// WallSegment.java
public record WallSegment(double x1, double y1, double x2, double y2) {}

// Opening.java
public record Opening(
    String type,  // "door" | "window"
    double x1, double y1,
    double x2, double y2
) {
    public static final String DOOR   = "door";
    public static final String WINDOW = "window";
}
```

- Tường và cửa đều lưu dạng **jsonb** trong PostgreSQL (không dùng `@Embeddable`).
- `(x1,y1)` → điểm đầu, `(x2,y2)` → điểm cuối, đơn vị mét.

---

### 1.2 FloorPlanGeometry.java ⭐

**Mục đích:** Làm sạch kết quả AI, chuẩn hóa về gốc tọa độ (0,0). Pure functions, không phụ thuộc Spring.

**Hằng số:**
| Hằng số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| `MIN_ROOM_SIZE` | 0.5 m | Kích thước phòng tối thiểu |
| `MAX_ROOM_SIZE` | 50.0 m | Kích thước phòng tối đa |
| `DEFAULT_ROOM_SIZE` | 4.0 m | Fallback khi AI sai |
| `MIN_CEILING` | 1.8 m | Chiều cao trần tối thiểu |
| `MAX_CEILING` | 6.0 m | Chiều cao trần tối đa |
| `DEFAULT_CEILING` | 2.7 m | Chiều cao trần mặc định |
| `MIN_WALL_LENGTH` | 0.05 m | Tường ngắn hơn → bỏ |
| `MAX_WALLS` | 64 | Số tường tối đa |
| `MAX_OPENINGS` | 30 | Số cửa tối đa |

**Luồng `normalize(raw)`:**
```
1. Lọc walls: bỏ NaN/Infinity, bỏ tường < 5cm, giới hạn 64 tường
        │
        ▼
2. Kiểm tra ceiling: ngoài [1.8m, 6.0m] → dùng 2.7m mặc định
        │
        ▼
3. Nếu < 3 tường hợp lệ → fallback hình chữ nhật
        │
        ▼
4. Tính bounding box: minX, minY, maxX, maxY
        │
        ▼
5. Dịch tọa độ: trừ (minX, minY) khỏi mọi điểm → (0,0)
        │
        ▼
6. Lọc openings: bỏ type lạ, NaN, cửa < 20cm / > 10m; dịch theo
        │
        ▼
7. Trả RoomAnalysisResult đã chuẩn hóa (làm tròn cm)
```

---

### 1.3 ScanCorrection.java ⭐

**Mục đích:** Tự động sửa floor plan sau `normalize()` để người dùng sửa ít hơn. Chạy 4 bước tuần tự; bước nào tạo ra polygon hỏng thì bỏ qua.

**Hằng số:**
| Hằng số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| `MAX_TILT_DEG` | 15° | Nghiêng hơn → không xoay (phòng có góc thật) |
| `SQUARE_TOLERANCE_DEG` | 10° | Lệch hơn → không làm thẳng |
| `MIN_WALL` | 0.2 m | Tường ngắn hơn → gộp điểm |
| `GRID` | 0.05 m | Lưới snap 5cm |
| `OPENING_SNAP_DISTANCE` | 0.5 m | Cửa cách tường xa hơn → giữ nguyên |
| `MIN_SCALE` / `MAX_SCALE` | 0.2 / 5 | Giới hạn kéo giãn |

**4 bước `apply(in, hints)`:**

```
Bước 1 — Khử tilt (xoay nhẹ)
  dominantTilt(): góc lệch TB (cân theo chiều dài tường, dùng trick x4 góc → period 90°)
  Nếu |tilt| ∈ (0.5°, 15°] → xoay ngược quanh centroid; openings xoay theo

Bước 2 — Vuông góc hóa
  square(): 3 vòng lặp:
    - mergeSameDirection(): gộp 2 cạnh cùng hướng (cùng H/V)
    - Mỗi cạnh "gần ngang" (< 10°) → đặt y trung bình 2 đầu
    - Mỗi cạnh "gần đứng" (< 10°) → đặt x trung bình 2 đầu
    - dropShortWalls(): tường < 20cm → gộp điểm giữa
    - mergeStraight(): xoá điểm nằm giữa đường thẳng
  Chỉ áp dụng nếu kết quả usable: ≥3 góc, diện tích ≥1m², không tự cắt

Bước 3 — Scale theo đo thực của user
  ScanHints: { roomLengthMeters, roomWidthMeters, ceilingHeightMeters }
  scale(): cạnh dài đo → cạnh dài AI, cạnh ngắn đo → cạnh ngắn AI
  Giới hạn hệ số [0.2, 5.0]; openings scale theo

Bước 4 — Snap lưới 5cm + snap cửa lên tường
  Làm tròn tọa độ góc về lưới 5cm
  mergeStraight() lần cuối
  snapOpening(): chiếu tâm cửa lên tường gần nhất (≤50cm), rồi chiếu 2 đầu
```

**Helpers quan trọng:**
- `corners()`: kiểm tra tường tạo thành vòng khép kín (khoảng cách đầu-cuối < 1cm).
- `usable(p)`: `size ≥ 3 && |area| ≥ 1.0 && !selfIntersecting`.
- `selfIntersecting()`: dùng cross product, bỏ qua 2 cạnh kề nhau.

---

## PHẦN 2 — HÌNH HỌC PHÍA CLIENT

### 2.1 room-geometry.ts ⭐

**Vị trí:** `mobile-app/src/utils/room-geometry.ts`

Thư viện TypeScript thuần — không phụ thuộc React. Tương đương `FloorPlanGeometry` + `ScanCorrection` phía frontend.

**Kiểu dữ liệu:**
```typescript
interface Point { x: number; y: number; }

interface WallOpening {
  type: 'door' | 'window';
  wall: number;   // index tường trong polygon
  t: number;      // vị trí 0..1 trên tường
  width: number;  // bề rộng cửa (mét)
}
```

**Nhóm hàm theo chức năng:**

#### Chuyển đổi tường ↔ polygon
| Hàm | Mô tả |
|-----|-------|
| `wallsToPolygon(walls)` | Nối WallSegment thành Point[], null nếu không khép |
| `floorPlanPolygon(plan)` | wallsToPolygon hoặc fallback hình chữ nhật |
| `polygonToWalls(points)` | Point[] → Wall[] |

#### Hình học cơ bản
| Hàm | Mô tả |
|-----|-------|
| `wallAt(points, i)` | Trả [a, b] của tường thứ i (vòng lại) |
| `wallLength(points, i)` | Độ dài tường i |
| `polygonArea(points)` | Diện tích (shoelace formula) |
| `polygonBounds(points)` | Bounding box {minX, minY, maxX, maxY} |
| `pointInPolygon(p, points)` | Ray casting |
| `projectOnSegment(p, a, b)` | Điểm gần nhất trên đoạn, kèm t ∈ [0,1] |
| `nearestWall(p, points)` | Tường gần điểm p nhất |
| `isSelfIntersecting(points)` | Cross product kiểm tra cắt nhau |

#### Điều chỉnh vị trí
| Hàm | Mô tả |
|-----|-------|
| `pushInside(p, points, margin=0.2)` | Đẩy điểm ngoài phòng vào trong (thử 3 bước) |
| `setWallLength(points, i, length)` | Thay đổi chiều dài tường, giữ góc vuông tường kề |
| `splitWall(points, i)` | Thêm điểm giữa tường i |
| `removeCorner(points, i)` | Xoá góc i (cần ≥3 góc) |
| `normalizePolygon(points)` | Dịch về (0,0), làm tròn cm, trả shift + width/depth |

#### Cửa / cửa sổ
| Hàm | Mô tả |
|-----|-------|
| `openingsToWallOpenings(openings, points)` | Opening{x1y1x2y2} → WallOpening{wall,t,width} |
| `wallOpeningCenter(o, points)` | Tọa độ tâm cửa |
| `wallOpeningToOpening(o, points)` | WallOpening → Opening{x1y1x2y2}, cắt nếu to hơn tường |
| `reattachOpenings(openings, before, after)` | Gắn lại cửa vào tường gần nhất sau khi sửa polygon |

---

### 2.2 FloorPlanBackground.tsx

**Vị trí:** `mobile-app/src/components/design/FloorPlanBackground.tsx`

Vẽ mặt bằng 2D bằng `react-native-svg`. Không xử lý gesture — chỉ render.

**Props:**
```typescript
interface FloorPlanBackgroundProps {
  floorPlan: FloorPlan;
  width: number;      // px, tỉ lệ phải = roomWidth/roomDepth
  height: number;
  floorColor?: string;
  wallColor?: string;
  padding?: number;   // le quanh phòng để ghi số đo ngoài tường
}
```

**Scale:** `sx = width / roomWidth` (px/m), `sy = height / roomDepth`

**Thứ tự render:**
```
1. <ClipPath id="floor"> theo polygon phòng
2. <Polygon> tô màu nền sàn (floorColor, mặc định #2B2A28)
3. Lưới 1m (clip theo polygon)
4. Tường: <Line> strokeWidth=5, màu wallColor
5. Cửa: <Line> strokeWidth=7
        door   → DOOR_COLOR   = COLORS.accent (cam)
        window → WINDOW_COLOR = '#7EC8E3' (xanh lam)
6. Nhãn chiều dài mỗi tường:
        - Tính phap tuyến tường
        - pointInPolygon để chọn hướng ra ngoài
        - <Rect> nền tối + <SvgText> cách tường 12px
        - Bỏ qua tường px < 36px (quá ngắn)
```

---

## PHẦN 3 — TRÌNH CHỈNH SỬA (EDITOR)

### 3.1 Màn hình Editor — `app/(main)/editor/[id].tsx`

**Load dữ liệu (song song):**
```
loadEditorData(id, addId)
  ├─ designApi.getById(id)          → DesignDetail
  ├─ furnitureApi.list()            → Furniture[]
  └─ loadFloorPlan(roomImageId)     → FloorPlan | null (null nếu chưa quét)
```

**3 chế độ xem (`ViewMode`):**

| Mode | Render | Đặc điểm |
|------|--------|-----------|
| `'photo'` | Ảnh phòng + PlacedItem chồng lên | Nội thất tỉ lệ theo khung ảnh |
| `'plan'` | FloorPlanBackground SVG + PlacedItem | Nội thất đúng kích thước thực (mét → px) |
| `'3d'` | View3D (WebView Three.js) | Cần Internet lần đầu tải Three.js |

Phòng trống (`source === 'blank'`): ẩn tab `'photo'`, mặc định mở `'plan'`.

**Zoom & pan mặt bằng 2D (không dùng ScrollView):**
```
planFit = min(stageW / roomWidth, stageH / roomDepth) − 2*PLAN_PADDING
planZoom ∈ [1, 4]   (nút +/−, bước 1.5x)

panX, panY: Reanimated SharedValue
  - Giới hạn: panX ∈ [planViewW − planContentW, 0]
  - Phóng to quanh giữa khung nhìn: điều chỉnh pan theo tỉ lệ zoom mới
  - Kéo vùng trống = pan khung nhìn (Gesture.Pan trên background)
```

**Kích thước nội thất trên mặt bằng:**
```typescript
planSizeOf(item, plan, frame) = {
  w: max(14px, (item.width/100 / plan.roomWidth) * frame.width),
  h: max(14px, (item.depth/100 / plan.roomDepth) * frame.height)
}
```

**Khoảng cách tới tường khi kéo (`wallGaps`):**
```
Từ tâm vật phẩm, bắn tia ngang (trái/phải) và dọc (trên/dưới)
Tìm điểm cắt gần nhất với các cạnh polygon
Trừ đi nửa kích thước vật (theo hướng + góc xoay)
→ { left, right, top, bottom } (mét)
Hiển thị qua DragReadout component (chỉ cập nhật khi dịch ≥ 2px)
```

**EditorSnapshot (đơn vị hoàn tác):**
```typescript
interface EditorSnapshot {
  placements: FurniturePlacement[];
  floorPlan: FloorPlan | null;
  floorMaterial: string;
  wallMaterial: string;
  skirtingMaterial: string;
}
```

---

### 3.2 Kéo thả nội thất — `PlacedItem.tsx` ⭐

**Vị trí:** `mobile-app/src/components/editor/PlacedItem.tsx`

Chạy hoàn toàn trên **UI thread** (Reanimated worklet), không block JS thread.

**SharedValues (Reanimated):**
| SharedValue | Ý nghĩa |
|-------------|---------|
| `cx`, `cy` | Tọa độ tâm (px), cập nhật mỗi frame |
| `scale` | Hệ số phóng to [0.3, 3] |
| `rotation` | Góc quay (radian) |
| `start` | Snapshot lúc bắt đầu gesture |
| `reported` | Vị trí đã báo lần cuối cho `onDragMove` |

**Gesture pipeline (`Gesture.Simultaneous`):**
```
Gesture.Pan()
  .onStart → ghi start (cx, cy, scale, rotation)
  .onUpdate → cx = clamp(start.cx + dx, 0, frameW)
              cy = clamp(start.cy + dy, 0, frameH)
              report() nếu dịch ≥ 2px (báo khoảng cách tường)
  .onEnd → commit() → runOnJS(onChange)

Gesture.Pinch()
  .onUpdate → scale = clamp(start.scale * e.scale, 0.3, 3)
  .onEnd → commit()

Gesture.Rotation()
  .onUpdate → rotation = start.rotation + e.rotation
  .onEnd → commit()

Gesture.Tap()
  .onEnd → runOnJS(onSelect)
```

**`commit()` worklet:**
```
runOnJS(onSelect)(id)
runOnJS(onChange)(id, {
  x: clamp(cx/frameW, 0, 1),
  y: clamp(cy/frameH, 0, 1),
  scale,
  rotation: round((rotation * 180/π) % 360)
})
```

**`animatedStyle`:**
```
transform: [
  translateX(cx − w/2),
  translateY(cy − h/2),
  rotate(`${rotation}rad`),
  scale(scale)
]
```

**Sync từ ngoài:** `useEffect` đồng bộ `placement.x/y/scale/rotation` → SharedValues khi AI gợi ý thay đổi hoặc frame resize.

**`baseSizeOf(furniture, frame)`:** ước lượng kích thước px khi `scale=1`, giả sử phòng ~4m ngang.

---

### 3.3 Sửa phòng — `RoomShapeEditor.tsx` ⭐

**Vị trí:** `mobile-app/src/components/editor/RoomShapeEditor.tsx`

Toàn màn hình (SafeAreaView), không dùng Modal (tránh bug kích thước 0×0 trên Android).

**Props:**
```typescript
interface RoomShapeEditorProps {
  floorPlan: FloorPlan;
  onClose: () => void;
  onSave: (result: RoomShapeResult) => Promise<void>;
}

interface RoomShapeResult {
  roomWidth: number; roomDepth: number; ceilingHeight: number;
  walls: Wall[]; openings: Opening[];
  shift: Point;  // phòng đã dịch bao nhiêu (để dịch nội thất theo)
}
```

**State:**
```typescript
points: Point[]          // góc polygon hiện tại
openings: WallOpening[]  // cửa (wall index + t + width)
ceiling: string          // chiều cao trần (input text)
selection: { kind: 'corner'|'wall'|'opening', index } | null
view: { scale, offX, offY } | null  // transform px ↔ mét
```

**Khởi tạo khi mở:**
```
floorPlanPolygon(floorPlan)      → points
openingsToWallOpenings(openings) → openings (WallOpening[])
fitView(points, canvasW, canvasH) → view (canh vừa màn hình)
```

**CornerHandle — kéo góc tường:**
```
Gesture.Exclusive(Pan, Tap)
  Pan.onStart → ghi dragStartRef = points[i] (tọa độ mét)
  Pan.onUpdate →
    snapCorner(start + delta/scale, points, i):
      x = round(px / 0.05) * 0.05        // snap 5cm
      y = round(py / 0.05) * 0.05
      if |points[k].x − px| < 0.15: x = points[k].x  // thẳng đứng với góc bên cạnh
      if |points[k].y − py| < 0.15: y = points[k].y  // thẳng ngang
  Tap.onEnd → select corner
```

**Panel thao tác theo lựa chọn:**

| Selection | Thao tác |
|-----------|----------|
| `wall` | Đặt chiều dài (`setWallLength`), Thêm góc (`splitWall`), Thêm cửa/cửa sổ |
| `corner` | Kéo chấm tròn, Xoá góc (`removeCorner`, cần ≥3 góc) |
| `opening` | Đổi type, Đặt bề rộng, Dịch trái/phải 10cm, Xoá |

**Luồng Lưu (`handleSave`):**
```
1. Validate ceiling ∈ [1, 10]m
2. Validate không có tường < 10cm
3. Validate !isSelfIntersecting(points)
4. normalizePolygon(points) → { points, shift, width, depth }
5. Validate width/depth ∈ [0.5, 50]m
6. polygonToWalls(norm.points)
7. openings.map(o => wallOpeningToOpening(o, norm.points))
8. onSave({ roomWidth, roomDepth, ceilingHeight, walls, openings, shift })
→ onClose()
```

**Mở màn hình Sửa phòng từ Editor:**
```typescript
// Editor gọi:
openRoomShapeEditor(router, {
  floorPlan: currentFloorPlan,
  onSave: handleSaveShape
})
// → router.push('/room-shape')

// handleSaveShape trong Editor:
async (result) => {
  remember()  // ghi undo trước
  const updated = await floorPlanApi.update(floorPlan, shapeOf(result))
  setFloorPlan(updated)
  // pushInside: đẩy nội thất bị ra ngoài vào trong phòng mới
  setPlacements(prev => prev.map(p => {
    const inside = pushInside(
      { x: p.x * updated.roomWidth, y: p.y * updated.roomDepth },
      floorPlanPolygon(updated)
    )
    return { ...p, x: inside.x / updated.roomWidth, y: inside.y / updated.roomDepth }
  }))
  setPlanZoom(1)
}
```

**Singleton session (`room-shape-session.ts`):**
```typescript
// FloorPlan + callback không đi qua URL params → lưu vào biến module-level
let current: RoomShapeSession | null = null

openRoomShapeEditor(router, session) → current = session; router.push('/room-shape')
getRoomShapeSession()               → màn hình room-shape.tsx đọc lúc mount
clearRoomShapeSession(session)      → chỉ xoá nếu còn là phiên cũ
```

---

### 3.4 Hoàn tác / Làm lại — `useUndoHistory.ts` ⭐

**Vị trí:** `mobile-app/src/hooks/useUndoHistory.ts`

Generic hook `useUndoHistory<T>(limit=50)`. Dùng **ref arrays** (không re-render khi push/pop), chỉ setState cho counts.

**Interface:**
```typescript
interface UndoHistory<T> {
  record(snapshot: T, coalesceKey?: string, windowMs?: number): void
  peekUndo(): T | undefined
  peekRedo(): T | undefined
  undo(current: T): T | undefined
  redo(current: T): T | undefined
  canUndo: boolean
  canRedo: boolean
  size: number
  version: number  // tăng mỗi lần record/undo/redo
}
```

**Coalescing — gộp thao tác liên tục thành 1 bước:**
```
record(snapshot, coalesceKey, windowMs=1500):
  if coalesceKey === prev.key && now − prev.at < windowMs && past.length > 0:
    → không push (giữ điểm đầu của chuỗi), chỉ cập nhật timestamp
  else:
    past.push(snapshot); giới hạn limit=50
```

Ví dụ: bấm mũi tên 5 lần liên tục → chỉ 1 bước undo (`coalesceKey = 'nudge:<id>'`).

**Undo / Redo:**
```
undo(current):
  prev = past.pop()
  future.push(current)
  return prev   ← caller áp vào UI

redo(current):
  next = future.pop()
  past.push(current)
  return next
```

**Trong Editor — xử lý đặc biệt khi sửa phòng:**
```
restore('undo'/'redo'):
  target = peekUndo/peekRedo()
  shapeChanged = floorPlan khác target.floorPlan
  if shapeChanged:
    → floorPlanApi.update(current.floorPlan, shapeOf(target.floorPlan))
      (gửi lại mặt bằng cũ lên server trước khi apply)
  history.undo/redo(current)
  setPlacements/setFloorPlan/setMaterials từ target
```

**AI Hoàn tác:**
```
aiStep = history.version + 1  // ghi sau khi AI gợi ý
aiUndoable = aiStep !== null && history.version === aiStep
  → chỉ hiện nút "Hoàn tác AI" khi chưa có thao tác nào thêm sau AI
undoAi() → setAiNote(null); setAiStep(null); restore('undo')
```

---

### 3.5 Xem 3D — `View3D.tsx`

**Vị trí:** `mobile-app/src/components/design/View3D.tsx`

Render phòng 3D dùng **Three.js v0.169** trong `react-native-webview`. Dùng ES module + importmap từ CDN jsdelivr (cần Internet lần đầu).

**Dữ liệu gửi vào scene:**
```typescript
buildScene(props) = {
  room: { width, depth, height },        // mét
  floor: Point[],                        // polygon sàn (từ floorPlanPolygon)
  openings: Opening[],                   // cửa (toạ độ mét)
  floorColor, wallColor, skirtingColor,  // màu từ material
  floorTexture, wallTexture,             // { url, meters } (meters = 1 tile phủ bao nhiêu m)
  items: [{                              // mỗi nội thất
    x, z,           // tọa độ mét = p.x * roomWidth, p.y * roomDepth
    w, d, h,        // kích thước mét = cm/100 * scale
    rotation,       // độ
    category, name, material, modelUrl
  }]
}
```

**HTML được tạo động:**
```
buildView3DHtml(scene):
  - importmap: three → CDN jsdelivr
  - window.__SCENE__ = JSON.stringify(scene)
  - <script type="module"> SCENE_SCRIPT (Three.js logic)
  - Timeout 15s: hiện "Không tải được 3D"
```

**baseUrl:** `toAssetUrl('/')` → WebView dùng cùng origin với backend để tải texture không bị CORS.

**Snapshot 3D:**
```
WebView → postMessage({ type: 'snapshot', data: 'data:image/jpeg;base64,...' })
onMessage → onSnapshot(dataUrl)
  Nếu dirty: pendingThumbRef.current = dataUrl (chờ Lưu)
  Nếu !dirty: designMeta.saveThumbnail(id, dataUrl)
```

---

## PHẦN 4 — LUỒNG DỮ LIỆU ĐẦY ĐỦ

### 4.1 Tạo thiết kế từ ảnh phòng

```
[new-design.tsx] user chọn ảnh
  │
  ├─ POST /api/room-images/upload (multipart, field "file")
  │    → RoomImageController → StorageService → lưu file, trả { id, url, width, height }
  │
  ├─ POST /api/designs { name, roomImageId, roomType }
  │    → DesignController → trả Design { id, ... }
  │
  ├─ POST /api/ai/scan-room { roomImageId, extraImageIds?, roomLengthMeters?, ... }
  │    → AiController → AiService
  │         → RoomVisionClient (Gemini / OpenAI / Mock)
  │         → FloorPlanGeometry.normalize()
  │         → ScanCorrection.apply()
  │         → FloorPlanService.saveOrUpdate()
  │    → trả FloorPlan
  │
  └─ router.push('/editor/' + design.id)
```

### 4.2 Tạo phòng trống / mẫu

```
[BlankRoomForm] user chọn hình dạng + kích thước
  │
  ├─ POST /api/floor-plans/blank { roomWidth, roomDepth, ceilingHeight, walls?, openings? }
  │    → FloorPlanController → FloorPlanService.createBlank()
  │    → tạo RoomImage loại "blank" + FloorPlan tương ứng
  │    → trả FloorPlan { id, roomImageId, ... }
  │
  ├─ POST /api/designs { name, roomImageId: plan.roomImageId, roomType }
  │
  └─ router.push('/editor/' + design.id)
```

### 4.3 Sửa hình dạng phòng trong Editor

```
[Editor] user bấm "Sửa phòng"
  │
  ├─ remember()                       // ghi undo snapshot trước
  ├─ openRoomShapeEditor(router, { floorPlan, onSave: handleSaveShape })
  │
  │  [RoomShapeEditor] user kéo góc / sửa tường / cửa
  │   └─ handleSave() → onSave(result)
  │
  ├─ handleSaveShape(result):
  │   ├─ PUT /api/floor-plans/{id} { roomWidth, roomDepth, walls, openings, ... }
  │   ├─ setFloorPlan(updated)
  │   ├─ pushInside(): đẩy nội thất bị ra ngoài vào phòng mới
  │   └─ setPlanZoom(1)
  │
  └─ [Editor] hiển thị mặt bằng mới
```

---

## PHẦN 5 — CÁC FILE QUAN TRỌNG

| File | Vai trò |
|------|---------|
| `backend/.../FloorPlanGeometry.java` | Làm sạch kết quả AI (normalize, shift về 0,0) |
| `backend/.../ScanCorrection.java` | 4 bước tự động sửa: tilt/square/scale/snap |
| `mobile-app/src/utils/room-geometry.ts` | Hình học client: polygon, cửa, normalize, pushInside |
| `mobile-app/src/components/design/FloorPlanBackground.tsx` | SVG mặt bằng 2D (sàn, lưới, tường, cửa, số đo) |
| `mobile-app/src/components/editor/PlacedItem.tsx` | Kéo/xoay/phóng to nội thất (Reanimated UI thread) |
| `mobile-app/src/components/editor/RoomShapeEditor.tsx` | Màn hình sửa tường/góc/cửa |
| `mobile-app/src/hooks/useUndoHistory.ts` | Hoàn tác / làm lại (coalescing, 50 bước) |
| `mobile-app/src/components/design/View3D.tsx` | Three.js 3D trong WebView |
| `mobile-app/app/(main)/editor/[id].tsx` | Màn hình editor tổng hợp tất cả |
| `mobile-app/src/store/room-shape-session.ts` | Singleton truyền dữ liệu cho màn hình Sửa phòng |
