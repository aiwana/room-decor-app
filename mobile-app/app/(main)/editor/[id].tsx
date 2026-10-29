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
 *   - "Luu"       : luu tren may + PUT /api/designs/{id}
 *
 * Toa do luu theo ti le (0..1) nen anh, mat bang va 3D dung chung 1 bo vi tri,
 * va mo tren man hinh khac kich thuoc van dung cho.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';
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
import RoomShapeEditor, { type RoomShapeResult } from '@/components/editor/RoomShapeEditor';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import {
  DEFAULT_FLOOR_MATERIAL,
  DEFAULT_SKIRTING_MATERIAL,
  DEFAULT_WALL_MATERIAL,
  FALLBACK_MATERIALS,
  getMaterialColor,
} from '@/constants/materials';
import { useAsync } from '@/hooks/useAsync';
import { aiApi } from '@/services/ai-api';
import { getErrorMessage } from '@/services/api-error';
import { designApi } from '@/services/design-api';
import { floorPlanApi } from '@/services/floor-plan-api';
import { furnitureApi } from '@/services/furniture-api';
import { materialsApi } from '@/services/materials-api';
import type { DesignDetail, FloorPlan, Furniture, FurniturePlacement, IoniconName } from '@/types';
import { clamp, createId, firstParam, formatArea, formatPrice, toAssetUrl } from '@/utils';
import { buildQuote } from '@/utils/quote';
import { floorPlanPolygon, pushInside } from '@/utils/room-geometry';

/** Ti le khung anh mac dinh khi chua biet kich thuoc anh */
const DEFAULT_RATIO = 4 / 3;
const SCALE_STEP = 1.15;
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

const VIEW_MODES: { id: ViewMode; label: string; icon: IoniconName }[] = [
  { id: 'photo', label: 'Ảnh', icon: 'image-outline' },
  { id: 'plan', label: 'Mặt bằng', icon: 'grid-outline' },
  { id: '3d', label: '3D', icon: 'cube-outline' },
];

interface EditorData {
  design: DesignDetail;
  furniture: Furniture[];
  floorPlan: FloorPlan | null;
}

/** Mat bang khong tai duoc (mat mang...) thi van mo trinh chinh sua, chi thieu mat bang */
const loadFloorPlan = (roomImageId: string | null): Promise<FloorPlan | null> =>
  roomImageId ? floorPlanApi.getByRoomImage(roomImageId).catch(() => null) : Promise.resolve(null);

const loadEditorData = async (id: string): Promise<EditorData> => {
  const design = await designApi.getById(id);
  const [list, floorPlan] = await Promise.all([furnitureApi.list(), loadFloorPlan(design.roomImageId)]);
  return { design, furniture: list.items, floorPlan };
};

export default function EditorScreen() {
  const id = firstParam(useLocalSearchParams<{ id: string }>().id) ?? '';
  const { data, loading, error, reload } = useAsync(() => loadEditorData(id), [id]);

  if (loading && !data) return <LoadingView message="Đang mở thiết kế..." />;
  if (error || !data) return <ErrorView message={getErrorMessage(error)} onRetry={reload} />;
  return <Editor key={data.design.id} design={data.design} furniture={data.furniture} initialFloorPlan={data.floorPlan} />;
}

/* =========================================================================== */

interface EditorProps {
  design: DesignDetail;
  furniture: Furniture[];
  initialFloorPlan: FloorPlan | null;
}

function Editor({ design, furniture, initialFloorPlan }: EditorProps) {
  const navigation = useNavigation();

  const [placements, setPlacements] = useState<FurniturePlacement[]>(design.placements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  // Bo tri truoc lan goi y AI gan nhat, de "Hoan tac"
  const [beforeAi, setBeforeAi] = useState<FurniturePlacement[] | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Vung trong danh cho khung anh / mat bang / 3D (do bang onLayout)
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [planZoom, setPlanZoom] = useState(1);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  // Mon do them tu bang chon co the chua nam trong danh sach tai luc dau (vd loc theo danh muc)
  const [extraFurniture, setExtraFurniture] = useState<Furniture[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('photo');
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(initialFloorPlan);
  const [scanning, setScanning] = useState(false);
  const [floorMaterial, setFloorMaterial] = useState(design.floorMaterial ?? DEFAULT_FLOOR_MATERIAL);
  const [wallMaterial, setWallMaterial] = useState(design.wallMaterial ?? DEFAULT_WALL_MATERIAL);
  const [skirtingMaterial, setSkirtingMaterial] = useState(
    design.skirtingMaterial ?? DEFAULT_SKIRTING_MATERIAL,
  );
  const [shapeEditorOpen, setShapeEditorOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);

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
    if (!aiNote || beforeAi) return;
    const timer = setTimeout(() => setAiNote(null), AI_NOTE_MS);
    return () => clearTimeout(timer);
  }, [aiNote, beforeAi]);

  /* ---------------- Thao tac tren danh sach do ---------------- */
  const updatePlacements = (updater: (prev: FurniturePlacement[]) => FurniturePlacement[]): void => {
    setPlacements(updater);
    setDirty(true);
  };

  const handleChange = useCallback(
    (placementId: string, patch: Pick<FurniturePlacement, 'x' | 'y' | 'rotation' | 'scale'>): void => {
      setPlacements((prev) => prev.map((p) => (p.id === placementId ? { ...p, ...patch } : p)));
      setDirty(true);
    },
    [],
  );

  const handleSelect = useCallback((placementId: string): void => setSelectedId(placementId), []);

  const addFurniture = (item: Furniture): void => {
    setPickerOpen(false);
    if (!furnitureById.has(item.id)) setExtraFurniture((prev) => [...prev, item]);
    const placement: FurniturePlacement = { id: createId('pl'), furnitureId: item.id, x: 0.5, y: 0.6, rotation: 0, scale: 1 };
    updatePlacements((prev) => [...prev, placement]);
    setSelectedId(placement.id);
  };

  const patchSelected = (patch: (p: FurniturePlacement) => Partial<FurniturePlacement>): void => {
    if (!selectedId) return;
    updatePlacements((prev) => prev.map((p) => (p.id === selectedId ? { ...p, ...patch(p) } : p)));
  };

  const removeSelected = (): void => {
    if (!selectedId) return;
    updatePlacements((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
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
      setBeforeAi(placements);
      updatePlacements(() => result.placements);
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

  const undoAi = (): void => {
    if (!beforeAi) return;
    updatePlacements(() => beforeAi);
    setBeforeAi(null);
    setAiNote(null);
    setSelectedId(null);
  };

  /* ---------------- AI quet phong -> mat bang ---------------- */
  const runScan = async (): Promise<void> => {
    if (!design.roomImageId) {
      Alert.alert('Không quét được', 'Thiết kế này không còn ảnh phòng trên máy chủ.');
      return;
    }
    setScanning(true);
    try {
      // Quet lai van dung cac anh goc phong da chup luc tao thiet ke
      const result = await floorPlanApi.scan(design.roomImageId, { extraImageIds: floorPlan?.extraImageIds });
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
      updatePlacements(() => moved);
    }
    setFloorPlan(updated);
    setPlanZoom(1);
  };

  const onLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    setStage({ width, height: Math.max(MIN_STAGE_HEIGHT, height) });
  };

  const zoomPlan = (factor: number): void => setPlanZoom((z) => clamp(z * factor, 1, MAX_PLAN_ZOOM));

  // Cu chi tren nen mat bang (cho trong, khong phai mon do): cham = bo chon, chum 2 ngon = phong to
  const planBackgroundGesture = Gesture.Exclusive(
    Gesture.Pinch()
      .runOnJS(true)
      .onEnd((e) => zoomPlan(e.scale)),
    Gesture.Tap()
      .runOnJS(true)
      .onEnd(() => setSelectedId(null)),
  );

  /* ---------------- Render ---------------- */
  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: design.name,
          headerRight: () => (
            <Pressable onPress={(): void => void handleSave()} disabled={!dirty || saving} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.headerSave, (!dirty || saving) && styles.headerSaveDisabled]}>
                {saving ? 'Đang lưu' : dirty ? 'Lưu' : 'Đã lưu'}
              </Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.body}>
        <MockModeNotice />

        {/* ===== 1 dong: chon che do xem + nut vat lieu ===== */}
        <View style={styles.topBar}>
          <View style={styles.segment}>
            {VIEW_MODES.map((m) => {
              const active = viewMode === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={(): void => {
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
              // Phong to -> khung lon hon vung xem: keo cho trong de di chuyen (doc + ngang)
              <ScrollView
                style={planViewport}
                scrollEnabled={planZoom > 1}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <ScrollView
                  horizontal
                  scrollEnabled={planZoom > 1}
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {/* Le PLAN_PADDING quanh phong de ghi so do phia ngoai tuong */}
                  <View style={{ width: planFrame.width + 2 * PLAN_PADDING, height: planFrame.height + 2 * PLAN_PADDING }}>
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
                            />
                          );
                        })}
                    </View>
                  </View>
                </ScrollView>
              </ScrollView>
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
                <PillButton icon="construct-outline" label="Sửa phòng" onPress={(): void => setShapeEditorOpen(true)} />
                <PillButton icon="scan-outline" label={scanning ? 'Đang quét...' : 'Quét lại'} onPress={handleScan} disabled={scanning} />
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
            <Ionicons name="sparkles" size={16} color={COLORS.accent} />
            <Text style={styles.aiNoteText} numberOfLines={3}>
              {aiNote}
            </Text>
            {beforeAi ? (
              <Pressable onPress={undoAi} hitSlop={8} accessibilityRole="button" accessibilityLabel="Hoàn tác gợi ý">
                <Text style={styles.aiUndo}>Hoàn tác</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={(): void => {
                setAiNote(null);
                setBeforeAi(null);
              }}
              hitSlop={8}
              accessibilityLabel="Ẩn gợi ý"
            >
              <Ionicons name="close" size={16} color={COLORS.textSecondary} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* ===== Thanh dieu khien mon dang chon (co dinh, khong bi cat) ===== */}
      {selected ? (
        <View style={styles.selectedBar}>
          <Text style={styles.selectedName} numberOfLines={1}>
            {furnitureById.get(selected.furnitureId)?.name ?? 'Món đồ'}
          </Text>
          <View style={styles.selectedActions}>
            <ToolButton icon="refresh" label="Xoay" onPress={(): void => patchSelected((p) => ({ rotation: (p.rotation + 45) % 360 }))} />
            <ToolButton
              icon="remove"
              label="Nhỏ"
              onPress={(): void => patchSelected((p) => ({ scale: clamp(p.scale / SCALE_STEP, MIN_SCALE, MAX_SCALE) }))}
            />
            <ToolButton
              icon="add"
              label="To"
              onPress={(): void => patchSelected((p) => ({ scale: clamp(p.scale * SCALE_STEP, MIN_SCALE, MAX_SCALE) }))}
            />
            <ToolButton icon="trash-outline" label="Xoá" danger onPress={removeSelected} />
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

      {floorPlan ? (
        <RoomShapeEditor
          visible={shapeEditorOpen}
          floorPlan={floorPlan}
          onClose={(): void => setShapeEditorOpen(false)}
          onSave={handleSaveShape}
        />
      ) : null}


      <RoomMaterialPicker
        visible={materialPickerOpen}
        onClose={(): void => setMaterialPickerOpen(false)}
        materials={materials}
        floorMaterial={floorMaterial}
        wallMaterial={wallMaterial}
        skirtingMaterial={skirtingMaterial}
        onChangeFloor={(id): void => {
          setFloorMaterial(id);
          setDirty(true);
        }}
        onChangeWall={(id): void => {
          setWallMaterial(id);
          setDirty(true);
        }}
        onChangeSkirting={(id): void => {
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

/** Nut tron nho, nen mo (phong to / thu nho) */
const RoundButton: React.FC<OverlayButtonProps> = ({ icon, label, onPress }) => (
  <Pressable
    style={({ pressed }) => [styles.roundBtn, pressed && styles.overlayPressed]}
    onPress={onPress}
    hitSlop={4}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Ionicons name={icon} size={18} color={COLORS.textPrimary} />
  </Pressable>
);

/** Nut vien tron co chu, nen mo (Sua phong / Quet lai) */
const PillButton: React.FC<OverlayButtonProps> = ({ icon, label, onPress, disabled }) => (
  <Pressable
    style={({ pressed }) => [styles.pillBtn, (pressed || disabled) && styles.overlayPressed]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Ionicons name={icon} size={14} color={COLORS.textPrimary} />
    <Text style={styles.pillText}>{label}</Text>
  </Pressable>
);

interface ToolButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, onPress, danger }) => (
  <Pressable style={({ pressed }) => [styles.tool, pressed && styles.toolPressed]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
    <Ionicons name={icon} size={20} color={danger ? COLORS.danger : COLORS.textPrimary} />
    <Text style={[styles.toolLabel, danger && styles.toolDanger]}>{label}</Text>
  </Pressable>
);

const OVERLAY_BG = 'rgba(0,0,0,0.6)';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1, overflow: 'hidden', paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  headerSave: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  headerSaveDisabled: { color: COLORS.inactive },

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
  segmentText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
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
  planRoom: { position: 'absolute', left: PLAN_PADDING, top: PLAN_PADDING },
  cornerControls: { position: 'absolute', right: 6, bottom: 6, alignItems: 'flex-end', gap: 8 },
  zoomColumn: { gap: 6 },
  pillRow: { flexDirection: 'row', gap: 6 },
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
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  overlayPressed: { opacity: 0.6 },
  noPlan: {
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  noPlanText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  noImage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
  noImageText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  // Thong tin phong + huong dan + ghi chu AI
  planInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm, marginHorizontal: SPACING.md },
  planInfoDim: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  planInfoDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, textAlign: 'center', marginTop: 4, marginHorizontal: SPACING.md },
  tipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6, paddingHorizontal: SPACING.md },
  tip: { flexShrink: 1, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
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
  aiNoteText: { flex: 1, fontSize: 12, color: COLORS.textPrimary, lineHeight: 17 },
  aiUndo: { fontSize: 13, fontWeight: '700', color: COLORS.accent },

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
  selectedName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  selectedActions: { flexDirection: 'row', justifyContent: 'space-between' },
  tool: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: RADIUS.sm },
  toolPressed: { backgroundColor: COLORS.surfaceAlt },
  toolLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  toolDanger: { color: COLORS.danger },

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
  quoteLabel: { flexShrink: 1, fontSize: 12, color: COLORS.textSecondary },
  quoteMore: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  quoteValue: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  toolbar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  toolbarButton: { flex: 1, paddingHorizontal: SPACING.sm },
});
