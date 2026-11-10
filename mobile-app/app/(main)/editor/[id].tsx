/**
 * app/(main)/editor/[id].tsx
 * TRINH CHINH SUA (thay man Result cu): dat noi that vao phong, 3 che do xem:
 *   - "Ảnh phòng"   : dat noi that len anh chup
 *   - "Mặt bằng 2D" : mat bang nhin tu tren xuong do AI quet tu anh (POST /api/ai/scan-room),
 *                     noi that ve dung kich thuoc that theo met; luon vua khung, phong to bang 2 ngon / nut +-;
 *                     "Sửa phòng" mo RoomShapeEditor de sua goc, chieu dai tuong, cua
 *   - "3D"          : xem phong 3D (Three.js trong WebView)
 *
 *   - "Them do"   : mo bang chon noi that, mon moi dat o giua phong
 *   - Cu chi      : keo / chum (phong to) / xoay 2 ngon tren tung mon (xem PlacedItem)
 *   - Thanh duoi  : khi chon 1 mon -> xoay 45°, nho hon, to hon, xoa (cho ai khong quen cu chi)
 *   - "AI goi y"  : bang AiSuggestSheet (sap xep lai / them do, phong cach, ghi chu) -> POST /api/ai/suggest-layout;
 *                   chua co khoa AI thi backend tu xep theo luat; co nut "Hoan tac" de quay lai bo tri cu
 *   - Hoan tac / Lam lai (2 nut tron goc tren trai): moi thao tac (keo, them, xoa, xoay, to/nho, dich, AI goi y,
 *                   sua hinh phong, quet lai, doi vat lieu) la 1 buoc, giu toi da 50 buoc (useUndoHistory).
 *                   Buoc co doi hinh phong thi gui lai mat bang cu len may chu (PUT /api/floor-plans/{id})
 *   - Mat bang 2D : khong dung ScrollView long nhau nua (Android de ScrollView "gianh" 1 huong keo, mon do
 *                   chi chay theo 1 truc). Tu xu ly: chum 2 ngon = phong to, keo cho trong = di chuyen khung nhin,
 *                   keo mon do = di chuyen tu do; dang keo hien khoang cach toi 4 phia tuong
 *   - "Luu"       : luu tren may + PUT /api/designs/{id}
 *
 * Toa do luu theo ti le (0..1) nen anh, mat bang va 3D dung chung 1 bo vi tri,
 * va mo tren man hinh khac kich thuoc van dung cho.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Button from '@/components/common/Button';
import { MockModeNotice } from '@/components/common/Notice';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import FloorPlanBackground from '@/components/design/FloorPlanBackground';
import View3D from '@/components/design/View3D';
import AiSuggestSheet, { type AiSuggestChoice } from '@/components/editor/AiSuggestSheet';
import FurniturePicker from '@/components/editor/FurniturePicker';
import PlacedItem, { MAX_SCALE, MIN_SCALE, type FrameSize } from '@/components/editor/PlacedItem';
import QuoteSheet from '@/components/editor/QuoteSheet';
import RoomMaterialPicker from '@/components/editor/RoomMaterialPicker';
import { type RoomShapeResult } from '@/components/editor/RoomShapeEditor';
import { COLORS, FONT, RADIUS, SPACING, TOUCH_MIN, TYPE } from '@/constants/colors';
import {
  DEFAULT_FLOOR_MATERIAL,
  DEFAULT_SKIRTING_MATERIAL,
  DEFAULT_WALL_MATERIAL,
  FALLBACK_MATERIALS,
  getMaterialColor,
} from '@/constants/materials';
import { getCategoryIcon } from '@/constants/furniture';
import { useAsync } from '@/hooks/useAsync';
import { useUndoHistory } from '@/hooks/useUndoHistory';
import { openRoomShapeEditor } from '@/store/room-shape-session';
import { aiApi } from '@/services/ai-api';
import { getErrorMessage } from '@/services/api-error';
import { designApi } from '@/services/design-api';
import { designMeta } from '@/services/design-meta';
import { floorPlanApi, type FloorPlanPatch } from '@/services/floor-plan-api';
import { furnitureApi } from '@/services/furniture-api';
import { materialsApi } from '@/services/materials-api';
import type { DesignDetail, DesignSummary, FloorPlan, Furniture, FurniturePlacement, IoniconName } from '@/types';
import { clamp, createId, firstParam, formatArea, formatPrice, toAssetUrl } from '@/utils';
import { buildQuote } from '@/utils/quote';
import { floorPlanPolygon, pushInside, type Point } from '@/utils/room-geometry';
import { haptic } from '@/utils/haptics';

/** Ti le khung anh mac dinh khi chua biet kich thuoc anh */
const DEFAULT_RATIO = 4 / 3;
const SCALE_STEP = 1.15;
/** Nhan doi mon do: ban sao lech 30 cm theo ca 2 chieu de khong de len ban goc */
const DUPLICATE_OFFSET_M = 0.3;
/** Nut mui ten: dich mon do 10 cm moi lan bam (thay cho keo, cho ai kho keo chinh xac) */
const NUDGE_M = 0.1;
/** Che do anh (chua co mat bang): dich 2% khung anh */
const NUDGE_PHOTO = 0.02;
const CM_PER_M = 100;
/** Mon do nho nhat tren mat bang (px) de van bam duoc */
const MIN_PLAN_ITEM = 14;
/** Phong to mat bang 2D: 1 = vua khung */
const MAX_PLAN_ZOOM = 4;
const PLAN_ZOOM_STEP = 1.5;
/** Khung xem khong nho hon (px) du man hinh thap */
const MIN_STAGE_HEIGHT = 220;
/** Le quanh mat bang (px) de ghi so do phia ngoai tuong */
const PLAN_PADDING = 24;
/** Ghi chu cua AI tu an sau (ms) */
const AI_NOTE_MS = 8000;
/** Da xem huong dan cu chi trong trinh chinh sua (chi hien lan dau) */
const TIP_SEEN_KEY = 'roomdecor.editorTipSeen';

type ViewMode = 'photo' | 'plan' | '3d';

/** 1 buoc trong lich su Hoan tac / Lam lai */
interface EditorSnapshot {
  placements: FurniturePlacement[];
  floorPlan: FloorPlan | null;
  floorMaterial: string;
  wallMaterial: string;
  skirtingMaterial: string;
}

/** Phan hinh dang phong cua mat bang (gui lai len may chu khi hoan tac buoc sua phong) */
const shapeOf = (p: FloorPlan): FloorPlanPatch => ({
  roomWidth: p.roomWidth,
  roomDepth: p.roomDepth,
  ceilingHeight: p.ceilingHeight,
  walls: p.walls,
  openings: p.openings,
});

const sameShape = (a: FloorPlan, b: FloorPlan): boolean =>
  a === b || JSON.stringify(shapeOf(a)) === JSON.stringify(shapeOf(b));

/**
 * Khoang cach (met) tu mep mon do toi tuong theo 4 huong: tia ngang / doc tu tam mon do,
 * gap canh tuong gan nhat. hx, hy = nua be ngang / doc cua mon do (da tinh goc xoay).
 * Am = mon do dang de len tuong; Infinity = khong gap tuong.
 */
const wallGaps = (
  c: Point,
  hx: number,
  hy: number,
  polygon: Point[],
): { left: number; right: number; top: number; bottom: number } => {
  let left = Infinity;
  let right = Infinity;
  let top = Infinity;
  let bottom = Infinity;
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    if (a.y !== b.y && (a.y - c.y) * (b.y - c.y) <= 0) {
      const x = a.x + ((c.y - a.y) / (b.y - a.y)) * (b.x - a.x);
      if (x <= c.x) left = Math.min(left, c.x - x - hx);
      else right = Math.min(right, x - c.x - hx);
    }
    if (a.x !== b.x && (a.x - c.x) * (b.x - c.x) <= 0) {
      const y = a.y + ((c.x - a.x) / (b.x - a.x)) * (b.y - a.y);
      if (y <= c.y) top = Math.min(top, c.y - y - hy);
      else bottom = Math.min(bottom, y - c.y - hy);
    }
  });
  return { left, right, top, bottom };
};

const formatGap = (v: number): string => (!Number.isFinite(v) ? '–' : v < -0.005 ? 'đè tường' : `${Math.max(0, v).toFixed(2)} m`);

const VIEW_MODES: { id: ViewMode; label: string; icon: IoniconName }[] = [
  { id: 'photo', label: 'Ảnh', icon: 'image-outline' },
  { id: 'plan', label: 'Mặt bằng', icon: 'grid-outline' },
  { id: '3d', label: '3D', icon: 'cube-outline' },
];

interface EditorData {
  design: DesignDetail;
  furniture: Furniture[];
  floorPlan: FloorPlan | null;
  /** Mon do mang tu man "Chi tiet noi that" (nut "Dat vao thiet ke"), them ngay khi mo */
  addItem: Furniture | null;
}

/** Mat bang khong tai duoc (mat mang...) thi van mo trinh chinh sua, chi thieu mat bang */
const loadFloorPlan = (roomImageId: string | null): Promise<FloorPlan | null> =>
  roomImageId ? floorPlanApi.getByRoomImage(roomImageId).catch(() => null) : Promise.resolve(null);

const loadEditorData = async (id: string, addId?: string): Promise<EditorData> => {
  const design = await designApi.getById(id);
  const [list, floorPlan] = await Promise.all([furnitureApi.list(), loadFloorPlan(design.roomImageId)]);
  let addItem: Furniture | null = null;
  if (addId) {
    addItem = list.items.find((f) => f.id === addId) ?? (await furnitureApi.getById(addId).catch(() => null));
  }
  return { design, furniture: list.items, floorPlan, addItem };
};

export default function EditorScreen() {
  const params = useLocalSearchParams<{ id: string; add?: string }>();
  const id = firstParam(params.id) ?? '';
  const addId = firstParam(params.add);
  const { data, loading, error, reload } = useAsync(() => loadEditorData(id, addId), [id, addId]);

  if (loading && !data) return <LoadingView message="Đang mở thiết kế..." />;
  if (error || !data) return <ErrorView message={getErrorMessage(error)} onRetry={reload} />;
  return (
    <Editor
      key={data.design.id}
      design={data.design}
      furniture={data.furniture}
      initialFloorPlan={data.floorPlan}
      addItem={data.addItem}
    />
  );
}

/* =========================================================================== */

interface EditorProps {
  design: DesignDetail;
  furniture: Furniture[];
  initialFloorPlan: FloorPlan | null;
  addItem?: Furniture | null;
}

function Editor({ design, furniture, initialFloorPlan, addItem }: EditorProps) {
  const navigation = useNavigation();
  const router = useRouter();

  const [placements, setPlacements] = useState<FurniturePlacement[]>(design.placements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNoteText] = useState<string | null>(null);
  // Icon cua dong ghi chu: sparkles = loi AI, cube = thong bao thuong (vd vua dat do tu Chi tiet noi that)
  const [noteIcon, setNoteIcon] = useState<IoniconName>('sparkles');
  const setAiNote = useCallback((text: string | null, icon: IoniconName = 'sparkles'): void => {
    setNoteIcon(icon);
    setAiNoteText(text);
  }, []);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  // Phien ban lich su ngay sau lan AI goi y gan nhat: con dung so nay = chua thao tac gi them -> hien "Hoan tac" o ghi chu AI
  const [aiStep, setAiStep] = useState<number | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Vung trong danh cho khung anh / mat bang / 3D (do bang onLayout)
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [planZoom, setPlanZoom] = useState(1);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  // Mon do them tu bang chon co the chua nam trong danh sach tai luc dau (vd loc theo danh muc)
  const [extraFurniture, setExtraFurniture] = useState<Furniture[]>([]);
  // Phong trong / phong mau (khong co anh): mo thang mat bang, an tab "Ảnh" va nut "Quét lại"
  const isBlankRoom = initialFloorPlan?.source === 'blank';
  const viewModes = isBlankRoom ? VIEW_MODES.filter((m) => m.id !== 'photo') : VIEW_MODES;
  const [viewMode, setViewMode] = useState<ViewMode>(isBlankRoom ? 'plan' : 'photo');
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(initialFloorPlan);
  const [scanning, setScanning] = useState(false);
  const [floorMaterial, setFloorMaterial] = useState(design.floorMaterial ?? DEFAULT_FLOOR_MATERIAL);
  const [wallMaterial, setWallMaterial] = useState(design.wallMaterial ?? DEFAULT_WALL_MATERIAL);
  const [skirtingMaterial, setSkirtingMaterial] = useState(
    design.skirtingMaterial ?? DEFAULT_SKIRTING_MATERIAL,
  );
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);

  // Lich su Hoan tac / Lam lai. snapshotRef = trang thai dang hien thi (de ghi lai truoc moi thao tac)
  const history = useUndoHistory<EditorSnapshot>();
  const { record } = history;
  const snapshotRef = useRef<EditorSnapshot>({ placements, floorPlan, floorMaterial, wallMaterial, skirtingMaterial });
  snapshotRef.current = { placements, floorPlan, floorMaterial, wallMaterial, skirtingMaterial };
  const restoringRef = useRef(false);
  /** Ghi lai trang thai hien tai TRUOC khi thay doi; cung key trong windowMs = gop thanh 1 buoc */
  const remember = useCallback(
    (coalesceKey?: string, windowMs?: number): void => record(snapshotRef.current, coalesceKey, windowMs),
    [record],
  );
  const aiUndoable = aiStep !== null && history.version === aiStep;

  const materialsState = useAsync(() => materialsApi.list(), []);
  const materials = materialsState.data?.length ? materialsState.data : FALLBACK_MATERIALS;

  const furnitureById = useMemo(() => {
    const map = new Map<string, Furniture>();
    [...furniture, ...extraFurniture].forEach((f) => map.set(f.id, f));
    return map;
  }, [furniture, extraFurniture]);

  const containerWidth = stage.width;
  // Anh phong: vua ca chieu ngang lan chieu doc cua vung trong
  const photoWidth = Math.min(stage.width, stage.height * ratio);
  const photoFrame: FrameSize = { width: photoWidth, height: photoWidth / ratio };
  // Mat bang: ti le "vua khung" de thay tron phong (ke ca phong dai), roi nhan muc phong to
  const planFit = floorPlan
    ? Math.max(
        0,
        Math.min(
          (stage.width - 2 * PLAN_PADDING) / floorPlan.roomWidth,
          (stage.height - 2 * PLAN_PADDING) / floorPlan.roomDepth,
        ),
      )
    : 0;
  const planFrame: FrameSize | null = floorPlan
    ? { width: floorPlan.roomWidth * planFit * planZoom, height: floorPlan.roomDepth * planFit * planZoom }
    : null;
  const planViewport: FrameSize | null = planFrame
    ? {
        width: Math.min(stage.width, planFrame.width + 2 * PLAN_PADDING),
        height: Math.min(stage.height, planFrame.height + 2 * PLAN_PADDING),
      }
    : null;
  const selected = placements.find((p) => p.id === selectedId);
  const selectedItem = selected ? furnitureById.get(selected.furnitureId) : undefined;

  /* ---------------- Mat bang 2D: tu xu ly phong to + keo khung nhin (khong dung ScrollView) ---------------- */
  const planContentW = planFrame ? planFrame.width + 2 * PLAN_PADDING : 0;
  const planContentH = planFrame ? planFrame.height + 2 * PLAN_PADDING : 0;
  const planViewW = planViewport?.width ?? 0;
  const planViewH = planViewport?.height ?? 0;
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const panStart = useSharedValue({ x: 0, y: 0 });
  // Gioi han keo: noi dung khong troi ra khoi khung nhin (min <= pan <= 0)
  const panBounds = useSharedValue({ minX: 0, minY: 0 });
  const prevZoomRef = useRef(planZoom);
  useEffect(() => {
    const k = planZoom / prevZoomRef.current;
    prevZoomRef.current = planZoom;
    const minX = Math.min(0, planViewW - planContentW);
    const minY = Math.min(0, planViewH - planContentH);
    panBounds.value = { minX, minY };
    // Phong to quanh giua khung nhin
    panX.value = clamp(planViewW / 2 - (planViewW / 2 - panX.value) * k, minX, 0);
    panY.value = clamp(planViewH / 2 - (planViewH / 2 - panY.value) * k, minY, 0);
  }, [planZoom, planContentW, planContentH, planViewW, planViewH, panX, panY, panBounds]);
  const planContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.value }, { translateY: panY.value }],
  }));

  /* ---------------- Khoang cach toi tuong khi dang keo (chi ve lai o nho, khong ve lai ca man hinh) ---------------- */
  const readoutRef = useRef<((text: string | null) => void) | null>(null);
  const registerReadout = useCallback((fn: ((text: string | null) => void) | null): void => {
    readoutRef.current = fn;
  }, []);
  const furnitureByIdRef = useRef(furnitureById);
  furnitureByIdRef.current = furnitureById;
  const handleDragMove = useCallback(
    (placementId: string, x: number, y: number, rotationDeg: number, itemScale: number): void => {
      const plan = snapshotRef.current.floorPlan;
      const placement = snapshotRef.current.placements.find((p) => p.id === placementId);
      if (!plan || !placement) return;
      const item = furnitureByIdRef.current.get(placement.furnitureId);
      const w = ((item?.width ?? 100) / CM_PER_M) * itemScale;
      const d = ((item?.depth ?? 100) / CM_PER_M) * itemScale;
      const r = (rotationDeg * Math.PI) / 180;
      const cos = Math.abs(Math.cos(r));
      const sin = Math.abs(Math.sin(r));
      const gaps = wallGaps(
        { x: x * plan.roomWidth, y: y * plan.roomDepth },
        (cos * w + sin * d) / 2,
        (sin * w + cos * d) / 2,
        floorPlanPolygon(plan),
      );
      readoutRef.current?.(
        `Trái ${formatGap(gaps.left)} · Phải ${formatGap(gaps.right)}\nTrên ${formatGap(gaps.top)} · Dưới ${formatGap(gaps.bottom)}`,
      );
    },
    [],
  );
  const floorItem = materials.find((m) => m.code === floorMaterial);
  const wallItem = materials.find((m) => m.code === wallMaterial);
  const skirtingItem = materials.find((m) => m.code === skirtingMaterial);

  const quote = useMemo(
    () =>
      buildQuote({
        floorPlan,
        placements,
        furnitureById,
        materials,
        floorMaterial,
        wallMaterial,
        skirtingMaterial,
      }),
    [floorPlan, placements, furnitureById, materials, floorMaterial, wallMaterial, skirtingMaterial],
  );

  /* ---------------- Tom tat + anh 3D cho man "Của tôi" (luu tren may) ---------------- */
  // Chi ghi khi da luu (dirty = false) de the o "Của tôi" khop voi ban da luu, khong phai ban dang sua do.
  useEffect(() => {
    if (dirty || !floorPlan) return;
    const timer = setTimeout(() => {
      const summary: DesignSummary = {
        polygon: floorPlanPolygon(floorPlan),
        roomWidth: floorPlan.roomWidth,
        roomDepth: floorPlan.roomDepth,
        items: placements.map((p) => {
          const f = furnitureById.get(p.furnitureId);
          return {
            x: p.x * floorPlan.roomWidth,
            y: p.y * floorPlan.roomDepth,
            w: ((f?.width ?? 100) / CM_PER_M) * p.scale,
            d: ((f?.depth ?? 100) / CM_PER_M) * p.scale,
            rotation: p.rotation,
          };
        }),
        floorArea: quote.floorArea ?? 0,
        quoteTotal: quote.total,
        source: floorPlan.source === 'blank' ? 'blank' : 'photo',
      };
      designMeta.update(design.id, { summary }).catch(() => undefined);
    }, 800);
    return () => clearTimeout(timer);
  }, [dirty, floorPlan, placements, furnitureById, quote, design.id]);

  // Anh 3D chup khi dang co thay doi chua luu -> giu lai, chi ghi khi bam Luu
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const pendingThumbRef = useRef<string | null>(null);
  const handleSnapshot = useCallback(
    (dataUrl: string): void => {
      if (dirtyRef.current) {
        pendingThumbRef.current = dataUrl;
        return;
      }
      pendingThumbRef.current = null;
      designMeta.saveThumbnail(design.id, dataUrl).catch(() => undefined);
    },
    [design.id],
  );

  /** Kich thuoc that (met -> px) cua mon do tren mat bang */
  const planSizeOf = (item: Furniture | undefined, plan: FloorPlan, f: FrameSize): { w: number; h: number } => ({
    w: Math.max(MIN_PLAN_ITEM, ((item?.width ?? 100) / CM_PER_M / plan.roomWidth) * f.width),
    h: Math.max(MIN_PLAN_ITEM, ((item?.depth ?? 100) / CM_PER_M / plan.roomDepth) * f.height),
  });

  /* ---------------- Canh bao khi thoat ma chua luu ---------------- */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!dirty) return;
      e.preventDefault();
      Alert.alert('Chưa lưu thay đổi', 'Bạn có muốn bỏ các thay đổi chưa lưu?', [
        { text: 'Ở lại', style: 'cancel' },
        { text: 'Bỏ thay đổi', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, dirty]);

  /* ---------------- Huong dan chi hien lan dau, ghi chu AI tu an ---------------- */
  useEffect(() => {
    AsyncStorage.getItem(TIP_SEEN_KEY)
      .then((seen) => setTipVisible(!seen))
      .catch(() => setTipVisible(true));
  }, []);

  const dismissTip = (): void => {
    setTipVisible(false);
    AsyncStorage.setItem(TIP_SEEN_KEY, '1').catch(() => undefined);
  };

  useEffect(() => {
    // Ghi chu co nut "Hoan tac" thi giu lai den khi nguoi dung dong
    if (!aiNote || aiUndoable) return;
    const timer = setTimeout(() => setAiNoteText(null), AI_NOTE_MS);
    return () => clearTimeout(timer);
  }, [aiNote, aiUndoable]);

  /* ---------------- Thao tac tren danh sach do ---------------- */
  /** Moi thay doi danh sach do deu ghi 1 buoc lich su truoc (coalesceKey: gop cac lan bam lien tuc) */
  const updatePlacements = (
    updater: (prev: FurniturePlacement[]) => FurniturePlacement[],
    coalesceKey?: string,
  ): void => {
    remember(coalesceKey);
    setPlacements(updater);
    setDirty(true);
  };

  const handleChange = useCallback(
    (placementId: string, patch: Pick<FurniturePlacement, 'x' | 'y' | 'rotation' | 'scale'>): void => {
      readoutRef.current?.(null);
      // Keo + chum cung luc ket thuc gan nhau -> van chi 1 buoc
      remember(`gesture:${placementId}`, 400);
      setPlacements((prev) => prev.map((p) => (p.id === placementId ? { ...p, ...patch } : p)));
      setDirty(true);
    },
    [remember],
  );

  const handleSelect = useCallback((placementId: string): void => setSelectedId(placementId), []);

  const addFurniture = (item: Furniture): void => {
    setPickerOpen(false);
    if (!furnitureById.has(item.id)) setExtraFurniture((prev) => [...prev, item]);
    // Giua phong; phong chu L... diem giua co the nam ngoai san -> day vao trong
    let x = 0.5;
    let y = 0.6;
    if (floorPlan) {
      const inside = pushInside({ x: x * floorPlan.roomWidth, y: y * floorPlan.roomDepth }, floorPlanPolygon(floorPlan));
      x = clamp(inside.x / floorPlan.roomWidth, 0, 1);
      y = clamp(inside.y / floorPlan.roomDepth, 0, 1);
    }
    const placement: FurniturePlacement = { id: createId('pl'), furnitureId: item.id, x, y, rotation: 0, scale: 1 };
    updatePlacements((prev) => [...prev, placement]);
    setSelectedId(placement.id);
  };

  // Mo tu "Chi tiet noi that" -> dat san mon do (chua luu: nguoi dung keo cho roi bam Luu)
  const addedRef = useRef(false);
  useEffect(() => {
    if (!addItem || addedRef.current) return;
    addedRef.current = true;
    addFurniture(addItem);
    setAiNote(`Đã đặt "${addItem.name}" vào giữa phòng. Kéo tới chỗ bạn muốn rồi bấm Lưu.`, 'cube-outline');
    // chi chay 1 lan khi mo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addItem]);

  const patchSelected = (patch: (p: FurniturePlacement) => Partial<FurniturePlacement>, coalesceKey?: string): void => {
    if (!selectedId) return;
    updatePlacements((prev) => prev.map((p) => (p.id === selectedId ? { ...p, ...patch(p) } : p)), coalesceKey);
  };

  /** Dich mon dang chon theo huong (dx, dy) = -1/0/1; y tang = xuong duoi man hinh */
  const nudgeSelected = (dx: number, dy: number): void => {
    const stepX = floorPlan ? NUDGE_M / floorPlan.roomWidth : NUDGE_PHOTO;
    const stepY = floorPlan ? NUDGE_M / floorPlan.roomDepth : NUDGE_PHOTO;
    // Bam mui ten nhieu lan lien tuc = 1 buoc Hoan tac
    patchSelected((p) => ({ x: clamp(p.x + dx * stepX, 0, 1), y: clamp(p.y + dy * stepY, 0, 1) }), `nudge:${selectedId}`);
  };

  const removeSelected = (): void => {
    if (!selectedId) return;
    haptic.warning();
    updatePlacements((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  };

  /** Nhan doi mon dang chon: ban sao lech 30 cm (hoac 4% khung anh), van nam trong san */
  const duplicateSelected = (): void => {
    const src = placements.find((p) => p.id === selectedId);
    if (!src) return;
    haptic.tap();
    let x = clamp(src.x + (floorPlan ? DUPLICATE_OFFSET_M / floorPlan.roomWidth : 0.04), 0, 1);
    let y = clamp(src.y + (floorPlan ? DUPLICATE_OFFSET_M / floorPlan.roomDepth : 0.04), 0, 1);
    if (floorPlan) {
      const inside = pushInside({ x: x * floorPlan.roomWidth, y: y * floorPlan.roomDepth }, floorPlanPolygon(floorPlan));
      x = clamp(inside.x / floorPlan.roomWidth, 0, 1);
      y = clamp(inside.y / floorPlan.roomDepth, 0, 1);
    }
    const copy: FurniturePlacement = { ...src, id: createId('pl'), x, y };
    updatePlacements((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  /* ---------------- AI goi y ---------------- */
  const runAi = async (choice: AiSuggestChoice): Promise<void> => {
    setAiSheetOpen(false);
    if (!design.roomImageId) {
      Alert.alert('Không dùng được AI', 'Thiết kế này không còn ảnh phòng trên máy chủ.');
      return;
    }
    setAiLoading(true);
    try {
      const result = await aiApi.suggestLayout(design.roomImageId, {
        ...choice,
        placements,
        furnitureById,
        catalog: furniture,
      });
      const known = new Set(furnitureById.keys());
      const added = result.newFurniture.filter((f) => !known.has(f.id));
      if (added.length > 0) setExtraFurniture((prev) => [...prev, ...added]);
      updatePlacements(() => result.placements);
      setAiStep(history.version + 1); // updatePlacements vua ghi 1 buoc -> version + 1
      setSelectedId(null);
      const suffix =
        result.source === 'rules'
          ? ' (Xếp tự động, AI chưa sẵn sàng.)'
          : result.source === 'sample'
            ? ' (Gợi ý mẫu ở chế độ thử.)'
            : '';
      setAiNote(`${result.description}${suffix}`);
    } catch (e) {
      Alert.alert('AI gợi ý thất bại', getErrorMessage(e));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAi = (): void => {
    if (!floorPlan) {
      Alert.alert('Cần quét phòng trước', 'AI cần biết hình dạng phòng. Mở tab "Mặt bằng" và bấm "Quét lại".');
      return;
    }
    setAiSheetOpen(true);
  };

  const closeAiSheet = useCallback((): void => setAiSheetOpen(false), []);

  /**
   * Hoan tac / Lam lai 1 buoc. Buoc co doi hinh phong -> gui mat bang cu len may chu truoc,
   * loi mang thi bao loi va giu nguyen lich su.
   */
  const restore = async (direction: 'undo' | 'redo'): Promise<void> => {
    if (restoringRef.current) return;
    const target = direction === 'undo' ? history.peekUndo() : history.peekRedo();
    if (!target) return;
    restoringRef.current = true;
    try {
      const current = snapshotRef.current;
      let plan = target.floorPlan ?? current.floorPlan;
      const shapeChanged = !!plan && !!current.floorPlan && !sameShape(plan, current.floorPlan);
      if (plan && current.floorPlan && shapeChanged) {
        plan = await floorPlanApi.update(current.floorPlan, shapeOf(plan));
      }
      if (direction === 'undo') history.undo(current);
      else history.redo(current);
      setPlacements(target.placements);
      setFloorPlan(plan);
      setFloorMaterial(target.floorMaterial);
      setWallMaterial(target.wallMaterial);
      setSkirtingMaterial(target.skirtingMaterial);
      setDirty(true);
      setSelectedId(null);
      if (shapeChanged) setPlanZoom(1);
    } catch (e) {
      Alert.alert(direction === 'undo' ? 'Không hoàn tác được' : 'Không làm lại được', getErrorMessage(e));
    } finally {
      restoringRef.current = false;
    }
  };

  const undoAi = (): void => {
    setAiNote(null);
    setAiStep(null);
    void restore('undo');
  };

  /* ---------------- AI quet phong -> mat bang ---------------- */
  const runScan = async (): Promise<void> => {
    if (!design.roomImageId) {
      Alert.alert('Không quét được', 'Thiết kế này không còn ảnh phòng trên máy chủ.');
      return;
    }
    if (isBlankRoom) {
      Alert.alert('Phòng không có ảnh', 'Phòng này được tạo không cần ảnh. Bấm "Sửa phòng" để chỉnh tường và cửa.');
      return;
    }
    setScanning(true);
    try {
      // Quet lai van dung cac anh goc phong da chup luc tao thiet ke
      const result = await floorPlanApi.scan(design.roomImageId, { extraImageIds: floorPlan?.extraImageIds });
      remember();
      setFloorPlan(result.floorPlan);
      setViewMode('plan');
    } catch (e) {
      Alert.alert('AI quét phòng thất bại', getErrorMessage(e));
    } finally {
      setScanning(false);
    }
  };

  const handleScan = (): void => {
    if (!floorPlan) {
      void runScan();
      return;
    }
    Alert.alert('Quét lại phòng?', 'Mặt bằng hiện tại sẽ được thay bằng kết quả quét mới. Nội thất vẫn giữ nguyên.', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Quét lại', onPress: (): void => void runScan() },
    ]);
  };

  /* ---------------- Luu ---------------- */
  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await designApi.savePlacements(design.id, placements, {
        floorMaterial,
        wallMaterial,
        skirtingMaterial,
      });
      setDirty(false);
      haptic.success();
      const thumb = pendingThumbRef.current;
      if (thumb) {
        pendingThumbRef.current = null;
        designMeta.saveThumbnail(design.id, thumb).catch(() => undefined);
      }
    } catch (e) {
      Alert.alert('Không lưu được thiết kế', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Luu hinh dang phong moi. Noi that giu nguyen vi tri that (met) trong phong,
   * mon nao bi nam ngoai tuong moi thi day vao trong.
   */
  const handleSaveShape = async ({ shift, ...patch }: RoomShapeResult): Promise<void> => {
    if (!floorPlan) return;
    const updated = await floorPlanApi.update(floorPlan, patch);
    remember(); // 1 buoc gom ca hinh phong lan vi tri do bi day vao trong
    const polygon = floorPlanPolygon(updated);
    const moved = placements.map((p) => {
      const inside = pushInside(
        { x: p.x * floorPlan.roomWidth - shift.x, y: p.y * floorPlan.roomDepth - shift.y },
        polygon,
      );
      return {
        ...p,
        x: clamp(inside.x / updated.roomWidth, 0, 1),
        y: clamp(inside.y / updated.roomDepth, 0, 1),
      };
    });
    const changed = (a: number, b: number): boolean => Math.abs(a - b) > 1e-4;
    if (moved.some((p, i) => changed(p.x, placements[i].x) || changed(p.y, placements[i].y))) {
      setPlacements(moved);
      setDirty(true);
    }
    setFloorPlan(updated);
    setPlanZoom(1);
  };
  // Man Sua phong goi ham luu qua ref -> luon dung ban moi nhat (placements, history...)
  const saveShapeRef = useRef(handleSaveShape);
  saveShapeRef.current = handleSaveShape;

  /** Mo man "Sửa phòng" (man hinh rieng trong Stack, khong dung Modal - xem app/(main)/room-shape.tsx) */
  const openShapeEditor = (): void => {
    if (!floorPlan) return;
    openRoomShapeEditor(router, { floorPlan, onSave: (r) => saveShapeRef.current(r) });
  };

  const onLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    setStage({ width, height: Math.max(MIN_STAGE_HEIGHT, height) });
  };

  const zoomPlan = (factor: number): void => setPlanZoom((z) => clamp(z * factor, 1, MAX_PLAN_ZOOM));

  // Cu chi tren nen mat bang (cho trong, khong phai mon do):
  //   cham = bo chon, chum 2 ngon = phong to, keo = di chuyen khung nhin (khi da phong to)
  const planBackgroundGesture = Gesture.Exclusive(
    Gesture.Simultaneous(
      Gesture.Pinch()
        .runOnJS(true)
        .onEnd((e) => zoomPlan(e.scale)),
      Gesture.Pan()
        .minDistance(6)
        .onStart(() => {
          panStart.value = { x: panX.value, y: panY.value };
        })
        .onUpdate((e) => {
          panX.value = Math.min(0, Math.max(panBounds.value.minX, panStart.value.x + e.translationX));
          panY.value = Math.min(0, Math.max(panBounds.value.minY, panStart.value.y + e.translationY));
        }),
    ),
    Gesture.Tap()
      .runOnJS(true)
      .onEnd(() => {
        setSelectedId(null);
      }),
  );

  /* ---------------- Render ---------------- */
  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: design.name,
          // Trang thai luu (nut Luu chinh nam o thanh duoi, de bam bang ngon cai)
          headerRight: () => (
            <View
              style={[styles.saveStatus, dirty && styles.saveStatusDirty]}
              accessibilityLiveRegion="polite"
              accessibilityLabel={saving ? 'Đang lưu' : dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}
            >
              <Ionicons
                name={saving ? 'cloud-upload-outline' : dirty ? 'ellipse' : 'checkmark-circle'}
                size={dirty && !saving ? 8 : 14}
                color={dirty ? COLORS.warningText : COLORS.success}
              />
              <Text style={[styles.saveStatusText, dirty && styles.saveStatusTextDirty]}>
                {saving ? 'Đang lưu' : dirty ? 'Chưa lưu' : 'Đã lưu'}
              </Text>
            </View>
          ),
        }}
      />

      <View style={styles.body}>
        <MockModeNotice />

        {/* ===== 1 dong: chon che do xem + nut vat lieu ===== */}
        <View style={styles.topBar}>
          <View style={styles.segment}>
            {viewModes.map((m) => {
              const active = viewMode === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  hitSlop={{ top: 6, bottom: 6 }}
                  onPress={(): void => {
                    haptic.select();
                    setViewMode(m.id);
                    setSelectedId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={m.icon} size={15} color={active ? COLORS.accent : COLORS.textSecondary} />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={styles.materialBtn}
            onPress={(): void => setMaterialPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Đổi vật liệu phòng"
          >
            {[floorItem, wallItem, skirtingItem].map((item, index) => {
              const uri = toAssetUrl(item?.textureUrl);
              return (
                <View
                  key={index}
                  style={[styles.materialDot, { backgroundColor: item?.colorHex ?? COLORS.surfaceAlt }]}
                >
                  {uri ? <Image source={{ uri }} style={styles.materialDotImage} contentFit="cover" /> : null}
                </View>
              );
            })}
          </Pressable>
        </View>

        {/* ===== Khung anh phong / mat bang / 3D: chiem phan con lai cua man hinh ===== */}
        <View style={styles.stage} onLayout={onLayout}>
          <View style={styles.frameWrap}>
            {containerWidth > 0 && viewMode === 'photo' ? (
              <View style={[styles.frame, { width: photoFrame.width, height: photoFrame.height }]}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={(): void => setSelectedId(null)}
                  accessibilityLabel="Ảnh căn phòng"
                >
                  {design.roomImageUri ? (
                    <Image
                      source={{ uri: design.roomImageUri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      onLoad={(e): void => {
                        const { width, height } = e.source;
                        if (width > 0 && height > 0) setRatio(clamp(width / height, 0.5, 2));
                      }}
                    />
                  ) : (
                    <View style={styles.noImage}>
                      <Ionicons name="image-outline" size={40} color={COLORS.inactive} />
                      <Text style={styles.noImageText}>Máy này không có ảnh phòng của thiết kế.</Text>
                    </View>
                  )}
                </Pressable>
                {placements.map((p) => (
                  <PlacedItem
                    key={p.id}
                    placement={p}
                    furniture={furnitureById.get(p.furnitureId)}
                    frame={photoFrame}
                    selected={p.id === selectedId}
                    onSelect={handleSelect}
                    onChange={handleChange}
                  />
                ))}
              </View>
            ) : null}

            {containerWidth > 0 && viewMode === 'plan' && floorPlan && planFrame && planViewport ? (
              // Phong to -> noi dung lon hon khung nhin: keo cho trong de di chuyen (planContentStyle)
              <View style={[planViewport, styles.planViewport]}>
                  {/* Le PLAN_PADDING quanh phong de ghi so do phia ngoai tuong */}
                  <Animated.View style={[{ width: planContentW, height: planContentH }, planContentStyle]}>
                    {/* Nen (cho trong): cham = bo chon, chum 2 ngon = phong to. Nam DUOI noi that */}
                    <GestureDetector gesture={planBackgroundGesture}>
                      <View style={StyleSheet.absoluteFill} accessibilityLabel="Mặt bằng 2D của phòng">
                        <FloorPlanBackground
                          floorPlan={floorPlan}
                          width={planFrame.width}
                          height={planFrame.height}
                          padding={PLAN_PADDING}
                          floorColor={getMaterialColor(floorMaterial, 'floor', materials)}
                          wallColor={getMaterialColor(wallMaterial, 'wall', materials)}
                        />
                      </View>
                    </GestureDetector>
                    <View
                      style={[styles.planRoom, { width: planFrame.width, height: planFrame.height }]}
                      pointerEvents="box-none"
                    >
                        {placements.map((p) => {
                          const item = furnitureById.get(p.furnitureId);
                          return (
                            <PlacedItem
                              key={p.id}
                              placement={p}
                              furniture={item}
                              frame={planFrame}
                              size={planSizeOf(item, floorPlan, planFrame)}
                              selected={p.id === selectedId}
                              onSelect={handleSelect}
                              onChange={handleChange}
                              onDragMove={handleDragMove}
                            />
                          );
                        })}
                    </View>
                  </Animated.View>
              </View>
            ) : null}

            {containerWidth > 0 && viewMode === '3d' && floorPlan ? (
              <View style={[styles.frame, { width: stage.width, height: stage.height }]}>
                <View3D
                  floorPlan={floorPlan}
                  placements={placements}
                  furnitureById={furnitureById}
                  floorMaterial={floorMaterial}
                  wallMaterial={wallMaterial}
                  skirtingMaterial={skirtingMaterial}
                  materials={materials}
                  onSnapshot={handleSnapshot}
                />
              </View>
            ) : null}

            {viewMode !== 'photo' && !floorPlan ? (
              <View style={[styles.noPlan, { width: stage.width }]}>
                <Ionicons name="scan-outline" size={40} color={COLORS.accent} />
                <Text style={styles.noPlanText}>Chưa có mặt bằng. AI sẽ quét ảnh phòng để dựng mặt bằng 2D và 3D.</Text>
                <Button title="Quét phòng bằng AI" iconName="scan-outline" onPress={handleScan} loading={scanning} />
              </View>
            ) : null}
          </View>

          {/* Hoan tac / Lam lai: goc tren ben trai, dung cho ca 3 che do xem */}
          {containerWidth > 0 ? (
            <View style={styles.historyControls} pointerEvents="box-none">
              <RoundButton
                icon="arrow-undo"
                label="Hoàn tác"
                onPress={(): void => void restore('undo')}
                disabled={!history.canUndo}
              />
              <RoundButton
                icon="arrow-redo"
                label="Làm lại"
                onPress={(): void => void restore('redo')}
                disabled={!history.canRedo}
              />
            </View>
          ) : null}
          {viewMode === 'plan' ? <DragReadout register={registerReadout} /> : null}

          {/* Nut gon o goc duoi ben phai, nam tren vung trong canh phong nen it khi che phong */}
          {viewMode !== 'photo' && floorPlan ? (
            <View style={styles.cornerControls} pointerEvents="box-none">
              {viewMode === 'plan' ? (
                <View style={styles.zoomColumn}>
                  <RoundButton icon="add" label="Phóng to" onPress={(): void => zoomPlan(PLAN_ZOOM_STEP)} />
                  <RoundButton icon="remove" label="Thu nhỏ" onPress={(): void => zoomPlan(1 / PLAN_ZOOM_STEP)} />
                  {planZoom > 1 ? (
                    <RoundButton icon="contract-outline" label="Vừa màn hình" onPress={(): void => setPlanZoom(1)} />
                  ) : null}
                </View>
              ) : null}
              <View style={styles.pillRow}>
                <PillButton
                  icon="construct-outline"
                  label="Sửa phòng"
                  onPress={openShapeEditor}
                />
                {isBlankRoom ? null : (
                  <PillButton icon="scan-outline" label={scanning ? 'Đang quét...' : 'Quét lại'} onPress={handleScan} disabled={scanning} />
                )}
              </View>
            </View>
          ) : null}
        </View>

        {/* ===== 1 dong thong tin phong; mo ta AI an sau nut (i) ===== */}
        {viewMode !== 'photo' && floorPlan ? (
          <View style={styles.planInfo}>
            <Text style={styles.planInfoDim} numberOfLines={1}>
              {`${formatArea(quote.floorArea ?? 0)} · trần ${floorPlan.ceilingHeight.toFixed(1)} m`}
            </Text>
            {floorPlan.description ? (
              <Pressable
                onPress={(): void => setShowDescription((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Mô tả của AI"
              >
                <Ionicons
                  name={showDescription ? 'information-circle' : 'information-circle-outline'}
                  size={18}
                  color={COLORS.accent}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {viewMode !== 'photo' && floorPlan?.description && showDescription ? (
          <Text style={styles.planInfoDesc}>{floorPlan.description}</Text>
        ) : null}

        {tipVisible ? (
          <Pressable style={styles.tipRow} onPress={dismissTip} accessibilityRole="button" accessibilityLabel="Ẩn hướng dẫn">
            <Text style={styles.tip}>
              {viewMode === '3d'
                ? 'Kéo 1 ngón để xoay góc nhìn, dùng 2 ngón để phóng to.'
                : placements.length === 0
                  ? 'Bấm "Thêm đồ" để đặt nội thất vào phòng.'
                  : 'Kéo để di chuyển món đồ, 2 ngón để phóng to và xoay. Chạm chỗ trống để bỏ chọn.'}
            </Text>
            <Ionicons name="close" size={14} color={COLORS.textSecondary} />
          </Pressable>
        ) : null}

        {aiNote ? (
          <View style={styles.aiNote}>
            <Ionicons name={noteIcon} size={16} color={COLORS.accent} />
            <Text style={styles.aiNoteText} numberOfLines={3}>
              {aiNote}
            </Text>
            {aiUndoable ? (
              <Pressable onPress={undoAi} hitSlop={8} accessibilityRole="button" accessibilityLabel="Hoàn tác gợi ý">
                <Text style={styles.aiUndo}>Hoàn tác</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={(): void => {
                setAiNote(null);
                setAiStep(null);
              }}
              hitSlop={8}
              accessibilityLabel="Ẩn gợi ý"
            >
              <Ionicons name="close" size={16} color={COLORS.textSecondary} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* ===== Bang mon dang chon: ten + kich thuoc | Xoay · Co (-/+) · Nhan doi · Xoa | dich 10 cm ===== */}
      {selected ? (
        <View style={styles.selectedBar}>
          <View style={styles.selectedHeader}>
            <View style={styles.selectedIcon}>
              <Ionicons
                name={getCategoryIcon(selectedItem?.category ?? '')}
                size={18}
                color={COLORS.accent}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.selectedName} numberOfLines={1}>
                {selectedItem?.name ?? 'Món đồ'}
              </Text>
              <Text style={styles.selectedMeta} numberOfLines={1}>
                {selectedItem
                  ? `${Math.round(selectedItem.width * selected.scale)} × ${Math.round(selectedItem.depth * selected.scale)} cm · xoay ${Math.round(selected.rotation)}°`
                  : `xoay ${Math.round(selected.rotation)}°`}
              </Text>
            </View>
            <Pressable
              style={styles.selectedClose}
              onPress={(): void => setSelectedId(null)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Bỏ chọn món đồ"
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.selectedActions}>
            <ToolButton
              icon="refresh"
              label="Xoay 45°"
              onPress={(): void => patchSelected((p) => ({ rotation: (p.rotation + 45) % 360 }), `rotate:${selectedId}`)}
            />
            <View style={styles.stepper} accessibilityRole="adjustable" accessibilityLabel={`Cỡ ${Math.round(selected.scale * 100)}%`}>
              <Pressable
                style={({ pressed }) => [styles.stepBtn, pressed && styles.toolPressed]}
                onPress={(): void =>
                  patchSelected((p) => ({ scale: clamp(p.scale / SCALE_STEP, MIN_SCALE, MAX_SCALE) }), `scale:${selectedId}`)
                }
                accessibilityRole="button"
                accessibilityLabel="Thu nhỏ món đồ"
              >
                <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
              </Pressable>
              <Text style={styles.stepValue}>{`${Math.round(selected.scale * 100)}%`}</Text>
              <Pressable
                style={({ pressed }) => [styles.stepBtn, pressed && styles.toolPressed]}
                onPress={(): void =>
                  patchSelected((p) => ({ scale: clamp(p.scale * SCALE_STEP, MIN_SCALE, MAX_SCALE) }), `scale:${selectedId}`)
                }
                accessibilityRole="button"
                accessibilityLabel="Phóng to món đồ"
              >
                <Ionicons name="add" size={18} color={COLORS.textPrimary} />
              </Pressable>
            </View>
            <ToolButton icon="copy-outline" label="Nhân đôi" onPress={duplicateSelected} />
            <ToolButton icon="trash-outline" label="Xoá" danger onPress={removeSelected} />
          </View>

          <View style={styles.nudgeRow}>
            <Ionicons name="move-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.nudgeLabel}>{floorPlan ? 'Dịch từng 10 cm' : 'Dịch từng chút'}</Text>
            <NudgeButton icon="arrow-back" label="Dịch sang trái" onPress={(): void => nudgeSelected(-1, 0)} />
            <NudgeButton icon="arrow-up" label="Dịch lên trên" onPress={(): void => nudgeSelected(0, -1)} />
            <NudgeButton icon="arrow-down" label="Dịch xuống dưới" onPress={(): void => nudgeSelected(0, 1)} />
            <NudgeButton icon="arrow-forward" label="Dịch sang phải" onPress={(): void => nudgeSelected(1, 0)} />
          </View>
        </View>
      ) : null}

      {/* ===== Thanh duoi: tong bao gia + nut thao tac (luon nam trong man hinh) ===== */}
      <View style={styles.bottomArea}>
        <Pressable
          style={styles.quoteBar}
          onPress={(): void => setQuoteOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Xem báo giá"
        >
          <Text style={styles.quoteLabel} numberOfLines={1}>
            {placements.length} món{floorPlan ? ` · ${formatArea(quote.floorArea ?? 0)} sàn` : ''}
          </Text>
          <View style={styles.quoteMore}>
            <Text style={styles.quoteValue}>{quote.total > 0 ? formatPrice(quote.total) : 'Chưa có giá'}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
          </View>
        </Pressable>
        <View style={styles.toolbar}>
          <Button title="Thêm đồ" iconName="add-circle-outline" variant="secondary" onPress={(): void => setPickerOpen(true)} style={styles.toolbarButton} />
          <Button
            title="AI gợi ý"
            iconName="sparkles-outline"
            variant="ghost"
            onPress={handleAi}
            loading={aiLoading}
            style={styles.toolbarButton}
          />
          <Button
            title={dirty ? 'Lưu' : 'Đã lưu'}
            iconName="save-outline"
            onPress={(): void => void handleSave()}
            disabled={!dirty}
            loading={saving}
            style={styles.toolbarButton}
          />
        </View>
      </View>

      <RoomMaterialPicker
        visible={materialPickerOpen}
        onClose={(): void => setMaterialPickerOpen(false)}
        materials={materials}
        floorMaterial={floorMaterial}
        wallMaterial={wallMaterial}
        skirtingMaterial={skirtingMaterial}
        onChangeFloor={(id): void => {
          remember('material:floor');
          setFloorMaterial(id);
          setDirty(true);
        }}
        onChangeWall={(id): void => {
          remember('material:wall');
          setWallMaterial(id);
          setDirty(true);
        }}
        onChangeSkirting={(id): void => {
          remember('material:skirting');
          setSkirtingMaterial(id);
          setDirty(true);
        }}
      />

      <QuoteSheet visible={quoteOpen} quote={quote} onClose={(): void => setQuoteOpen(false)} />

      <FurniturePicker visible={pickerOpen} onClose={(): void => setPickerOpen(false)} onPick={addFurniture} />

      <AiSuggestSheet
        visible={aiSheetOpen}
        hasFurniture={placements.length > 0}
        onClose={closeAiSheet}
        onSubmit={(choice): void => void runAi(choice)}
      />
    </View>
  );
}

interface OverlayButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** O nho hien khoang cach toi tuong khi dang keo; tu giu state rieng nen khong ve lai ca trinh chinh sua */
const DragReadout: React.FC<{ register: (fn: ((text: string | null) => void) | null) => void }> = ({ register }) => {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    register(setText);
    return () => register(null);
  }, [register]);
  if (!text) return null;
  return (
    <View style={styles.readout} pointerEvents="none" accessibilityLiveRegion="polite">
      <Text style={styles.readoutText}>{text}</Text>
    </View>
  );
};

/*
 * Nut noi tren mat bang (phong to, hoan tac, Sua phong, Quet lai).
 * LOI CU "bam Sua phong luc duoc luc khong": nut chi cao 32-34px, phan con lai den 44px la hitSlop.
 * hitSlop chi co tac dung ben JS; con react-native-gesture-handler (Android) tim view duoi ngon tay
 * theo KHUNG THAT cua view -> cham vao phan hitSlop thi no thay nen mat bang ben duoi, cu chi
 * "cham nen" (Tap) kich hoat va HUY luon lan bam cua nut -> modal Sua phong khong mo.
 * Sua: vung bam that (HitArea) rong du 44px, co mau nen gan nhu trong suot de gesture-handler
 * coi no la dich cham (view khong nen se bi bo qua), margin am de nut van nam dung cho cu.
 */
const HitArea: React.FC<{
  pad: number;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: (pressed: boolean) => React.ReactNode;
}> = ({ pad, label, onPress, disabled, children }) => (
  <Pressable
    style={[styles.hitArea, { padding: pad, margin: -pad }]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: !!disabled }}
  >
    {({ pressed }) => children(pressed)}
  </Pressable>
);

/** Nut tron nho, nen mo (phong to / thu nho / hoan tac) */
const RoundButton: React.FC<OverlayButtonProps> = ({ icon, label, onPress, disabled }) => (
  <HitArea pad={5} label={label} onPress={onPress} disabled={disabled}>
    {(pressed) => (
      <View style={[styles.roundBtn, pressed && styles.overlayPressed, disabled && styles.roundBtnDisabled]}>
        <Ionicons name={icon} size={18} color={COLORS.textPrimary} />
      </View>
    )}
  </HitArea>
);

/** Nut vien tron co chu, nen mo (Sua phong / Quet lai) */
const PillButton: React.FC<OverlayButtonProps> = ({ icon, label, onPress, disabled }) => (
  <HitArea pad={6} label={label} onPress={onPress} disabled={disabled}>
    {(pressed) => (
      <View style={[styles.pillBtn, (pressed || disabled) && styles.overlayPressed]}>
        <Ionicons name={icon} size={14} color={COLORS.textPrimary} />
        <Text style={styles.pillText}>{label}</Text>
      </View>
    )}
  </HitArea>
);

interface ToolButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, onPress, danger }) => (
  <Pressable style={({ pressed }) => [styles.tool, pressed && styles.toolPressed]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
    <Ionicons name={icon} size={20} color={danger ? COLORS.dangerText : COLORS.textPrimary} />
    <Text style={[styles.toolLabel, danger && styles.toolDanger]}>{label}</Text>
  </Pressable>
);

/** Nut mui ten vuong 44x44 (dich mon do khong can keo) */
const NudgeButton: React.FC<Omit<ToolButtonProps, 'danger'>> = ({ icon, label, onPress }) => (
  <Pressable
    style={({ pressed }) => [styles.nudgeBtn, pressed && styles.toolPressed]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Ionicons name={icon} size={20} color={COLORS.textPrimary} />
  </Pressable>
);

const OVERLAY_BG = 'rgba(0,0,0,0.6)';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1, overflow: 'hidden', paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  flex: { flex: 1, minWidth: 0 },
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  saveStatusDirty: { backgroundColor: COLORS.warningSoft },
  saveStatusText: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.success },
  saveStatusTextDirty: { color: COLORS.warningText },

  // 1 dong tren cung: che do xem + vat lieu
  topBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  segment: {
    flex: 1,
    flexDirection: 'row',
    padding: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 32,
    borderRadius: RADIUS.pill,
  },
  segmentItemActive: { backgroundColor: COLORS.accentSoft },
  segmentText: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.textPrimary },
  materialBtn: {
    flexDirection: 'row',
    gap: 2,
    padding: 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  materialDot: { width: 18, height: 30, borderRadius: 5, overflow: 'hidden' },
  materialDotImage: { width: '100%', height: '100%' },

  // Vung xem chinh
  stage: { flex: 1, minHeight: MIN_STAGE_HEIGHT, marginHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  frameWrap: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  frame: { backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  planViewport: { overflow: 'hidden' },
  planRoom: { position: 'absolute', left: PLAN_PADDING, top: PLAN_PADDING },
  historyControls: { position: 'absolute', left: 8, top: 8, flexDirection: 'row', gap: 10 },
  readout: {
    position: 'absolute',
    top: 6,
    left: 90,
    right: 6,
    alignItems: 'center',
  },
  readoutText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    overflow: 'hidden',
  },
  cornerControls: { position: 'absolute', right: 8, bottom: 8, alignItems: 'flex-end', gap: 12 },
  zoomColumn: { gap: 10 },
  pillRow: { flexDirection: 'row', gap: 12 },
  roundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OVERLAY_BG,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: OVERLAY_BG,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillText: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.textPrimary },
  overlayPressed: { opacity: 0.6 },
  // Gan trong suot nhung KHAC 0: view khong co nen thi gesture-handler Android bo qua, cham xuyen xuong mat bang
  hitArea: { backgroundColor: 'rgba(0,0,0,0.01)', borderRadius: RADIUS.pill },
  roundBtnDisabled: { opacity: 0.35 },
  noPlan: {
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  noPlanText: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  noImage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
  noImageText: { marginTop: SPACING.sm, fontSize: 13, fontFamily: FONT.regular, color: COLORS.textSecondary, textAlign: 'center' },

  // Thong tin phong + huong dan + ghi chu AI
  planInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm, marginHorizontal: SPACING.md },
  planInfoDim: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.textPrimary },
  planInfoDesc: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, lineHeight: 17, textAlign: 'center', marginTop: 4, marginHorizontal: SPACING.md },
  tipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6, paddingHorizontal: SPACING.md },
  tip: { flexShrink: 1, fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, textAlign: 'center' },
  aiNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  aiNoteText: { flex: 1, fontSize: 12, fontFamily: FONT.regular, color: COLORS.textPrimary, lineHeight: 17 },
  aiUndo: { fontSize: 13, fontFamily: FONT.bold, color: COLORS.accent },

  // Mon dang chon
  selectedBar: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  selectedIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  selectedName: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.textPrimary },
  selectedMeta: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 1 },
  selectedClose: { width: TOUCH_MIN, height: TOUCH_MIN, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
  selectedActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.fill,
  },
  stepBtn: { width: 40, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm },
  stepValue: { minWidth: 44, textAlign: 'center', fontSize: 13, fontFamily: FONT.semibold, color: COLORS.textPrimary },
  tool: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: RADIUS.sm },
  toolPressed: { backgroundColor: COLORS.surfaceAlt },
  toolLabel: { ...TYPE.caption, color: COLORS.textSecondary, marginTop: 2 },
  toolDanger: { color: COLORS.dangerText },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nudgeLabel: { ...TYPE.caption, flex: 1, color: COLORS.textSecondary },
  nudgeBtn: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fill,
  },

  // Thanh duoi: bao gia + nut
  bottomArea: { borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  quoteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  quoteLabel: { flexShrink: 1, fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary },
  quoteMore: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  quoteValue: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.accent },
  toolbar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  toolbarButton: { flex: 1, paddingHorizontal: SPACING.sm },
});
