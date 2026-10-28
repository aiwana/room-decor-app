/**
 * app/(main)/editor/[id].tsx
 * TRINH CHINH SUA (thay man Result cu): dat noi that vao phong, 3 che do xem:
 *   - "Ảnh phòng"   : dat noi that len anh chup
 *   - "Mặt bằng 2D" : mat bang nhin tu tren xuong do AI quet tu anh (POST /api/ai/scan-room),
 *                     noi that ve dung kich thuoc that theo met
 *   - "3D"          : xem phong 3D (Three.js trong WebView)
 *
 *   - "Them do"   : mo bang chon noi that, mon moi dat o giua phong
 *   - Cu chi      : keo / chum (phong to) / xoay 2 ngon tren tung mon (xem PlacedItem)
 *   - Thanh duoi  : khi chon 1 mon -> xoay 45°, nho hon, to hon, xoa (cho ai khong quen cu chi)
 *   - "AI goi y"  : POST /api/ai/suggest-layout (backend chua co AI -> goi y mau)
 *   - "Luu"       : luu tren may + PUT /api/designs/{id}
 *
 * Toa do luu theo ti le (0..1) nen anh, mat bang va 3D dung chung 1 bo vi tri,
 * va mo tren man hinh khac kich thuoc van dung cho.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';

import Button from '@/components/common/Button';
import Chip from '@/components/common/Chip';
import { MockModeNotice } from '@/components/common/Notice';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import FloorPlanBackground from '@/components/design/FloorPlanBackground';
import View3D from '@/components/design/View3D';
import FurniturePicker from '@/components/editor/FurniturePicker';
import PlacedItem, { MAX_SCALE, MIN_SCALE, type FrameSize } from '@/components/editor/PlacedItem';
import QuoteSheet from '@/components/editor/QuoteSheet';
import RoomMaterialPicker from '@/components/editor/RoomMaterialPicker';
import RoomSizeEditor, { type RoomSizeValues } from '@/components/editor/RoomSizeEditor';
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
import { floorPlanApi, rectangleWalls } from '@/services/floor-plan-api';
import { furnitureApi } from '@/services/furniture-api';
import { materialsApi } from '@/services/materials-api';
import type { DesignDetail, FloorPlan, Furniture, FurniturePlacement, IoniconName } from '@/types';
import { clamp, createId, firstParam, formatArea, formatPrice, toAssetUrl } from '@/utils';
import { buildQuote } from '@/utils/quote';

/** Ti le khung anh mac dinh khi chua biet kich thuoc anh */
const DEFAULT_RATIO = 4 / 3;
const SCALE_STEP = 1.15;
const CM_PER_M = 100;
/** Mon do nho nhat tren mat bang (px) de van bam duoc */
const MIN_PLAN_ITEM = 14;

const round2 = (value: number): number => Math.round(value * 100) / 100;

type ViewMode = 'photo' | 'plan' | '3d';

const VIEW_MODES: { id: ViewMode; label: string; icon: IoniconName }[] = [
  { id: 'photo', label: 'Ảnh phòng', icon: 'image-outline' },
  { id: 'plan', label: 'Mặt bằng 2D', icon: 'grid-outline' },
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
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
  const [sizeEditorOpen, setSizeEditorOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);

  const materialsState = useAsync(() => materialsApi.list(), []);
  const materials = materialsState.data?.length ? materialsState.data : FALLBACK_MATERIALS;

  const furnitureById = useMemo(() => {
    const map = new Map<string, Furniture>();
    [...furniture, ...extraFurniture].forEach((f) => map.set(f.id, f));
    return map;
  }, [furniture, extraFurniture]);

  const photoFrame: FrameSize = { width: containerWidth, height: containerWidth / ratio };
  const planFrame: FrameSize | null = floorPlan
    ? { width: containerWidth, height: (containerWidth * floorPlan.roomDepth) / floorPlan.roomWidth }
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
  const runAi = async (): Promise<void> => {
    if (!design.roomImageId) {
      Alert.alert('Không dùng được AI', 'Thiết kế này không còn ảnh phòng trên máy chủ.');
      return;
    }
    setAiLoading(true);
    try {
      const result = await aiApi.suggestLayout(design.roomImageId, furniture);
      updatePlacements(() => result.placements);
      setSelectedId(null);
      setAiNote(result.isSample ? `${result.description} (AI chưa sẵn sàng, đây là gợi ý mẫu.)` : result.description);
    } catch (e) {
      Alert.alert('AI gợi ý thất bại', getErrorMessage(e));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAi = (): void => {
    if (placements.length === 0) {
      void runAi();
      return;
    }
    Alert.alert('Dùng gợi ý của AI?', 'Các món đồ đang đặt sẽ được thay bằng bố trí AI gợi ý.', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đồng ý', onPress: (): void => void runAi() },
    ]);
  };

  /* ---------------- AI quet phong -> mat bang ---------------- */
  const runScan = async (): Promise<void> => {
    if (!design.roomImageId) {
      Alert.alert('Không quét được', 'Thiết kế này không còn ảnh phòng trên máy chủ.');
      return;
    }
    setScanning(true);
    try {
      const result = await floorPlanApi.scan(design.roomImageId);
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

  const handleSaveRoomSize = async (values: RoomSizeValues): Promise<void> => {
    if (!floorPlan) return;
    const ratioX = floorPlan.roomWidth > 0 ? values.roomWidth / floorPlan.roomWidth : 1;
    const ratioY = floorPlan.roomDepth > 0 ? values.roomDepth / floorPlan.roomDepth : 1;
    const walls =
      floorPlan.walls.length > 0
        ? floorPlan.walls.map((w) => ({
            x1: round2(w.x1 * ratioX),
            y1: round2(w.y1 * ratioY),
            x2: round2(w.x2 * ratioX),
            y2: round2(w.y2 * ratioY),
          }))
        : rectangleWalls(values.roomWidth, values.roomDepth);
    const updated = await floorPlanApi.update(floorPlan, { ...values, walls });
    setFloorPlan(updated);
  };

  const onLayout = (e: LayoutChangeEvent): void => setContainerWidth(e.nativeEvent.layout.width);

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

        {/* ===== Chon che do xem ===== */}
        <View style={styles.modes}>
          {VIEW_MODES.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              iconName={m.icon}
              selected={viewMode === m.id}
              onPress={(): void => {
                setViewMode(m.id);
                setSelectedId(null);
              }}
            />
          ))}
        </View>

        <Pressable
          style={styles.materialSummary}
          onPress={(): void => setMaterialPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Đổi vật liệu phòng"
        >
          <View style={styles.materialDots}>
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
          </View>
          <View style={styles.materialSummaryText}>
            <Text style={styles.materialSummaryLabel}>Vật liệu phòng</Text>
            <Text style={styles.materialSummaryValue} numberOfLines={1}>
              {[floorItem?.name, wallItem?.name, skirtingItem?.name].filter(Boolean).join(' · ') ||
                'Chọn vật liệu'}
            </Text>
          </View>
          <View style={styles.materialChange}>
            <Text style={styles.materialChangeText}>Đổi</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.accent} />
          </View>
        </Pressable>

        {/* ===== Khung anh phong / mat bang / 3D + do ===== */}
        <View style={styles.frameWrap} onLayout={onLayout}>
          {containerWidth > 0 && viewMode === 'photo' ? (
            <View style={[styles.frame, { height: photoFrame.height }]}>
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

          {containerWidth > 0 && viewMode === 'plan' && floorPlan && planFrame ? (
            <View style={[styles.frame, { height: planFrame.height }]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={(): void => setSelectedId(null)}
                accessibilityLabel="Mặt bằng 2D của phòng"
              >
                <FloorPlanBackground
                  floorPlan={floorPlan}
                  width={planFrame.width}
                  height={planFrame.height}
                  floorColor={getMaterialColor(floorMaterial, 'floor', materials)}
                  wallColor={getMaterialColor(wallMaterial, 'wall', materials)}
                />
              </Pressable>
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
          ) : null}

          {containerWidth > 0 && viewMode === '3d' && floorPlan ? (
            <View style={[styles.frame, { height: Math.round(containerWidth * 0.75) }]}>
              <View3D
                floorPlan={floorPlan}
                placements={placements}
                furnitureById={furnitureById}
                floorMaterial={floorMaterial}
                wallMaterial={wallMaterial}
              />
            </View>
          ) : null}

          {viewMode !== 'photo' && !floorPlan ? (
            <View style={styles.noPlan}>
              <Ionicons name="scan-outline" size={40} color={COLORS.accent} />
              <Text style={styles.noPlanText}>Chưa có mặt bằng. AI sẽ quét ảnh phòng để dựng mặt bằng 2D và 3D.</Text>
              <Button title="Quét phòng bằng AI" iconName="scan-outline" onPress={handleScan} loading={scanning} />
            </View>
          ) : null}
        </View>

        {viewMode !== 'photo' && floorPlan ? (
          <View style={styles.planInfo}>
            <View style={styles.planInfoTextWrap}>
              <Pressable
                style={styles.sizeButton}
                onPress={(): void => setSizeEditorOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Chỉnh kích thước phòng"
              >
                <Text style={styles.planInfoDim}>
                  {`Phòng ${floorPlan.roomWidth.toFixed(1)} × ${floorPlan.roomDepth.toFixed(1)} m · trần ${floorPlan.ceilingHeight.toFixed(1)} m`}
                </Text>
                <Ionicons name="create-outline" size={14} color={COLORS.accent} />
              </Pressable>
              {floorPlan.description ? (
                <Text style={styles.planInfoDesc} numberOfLines={2}>
                  {floorPlan.description}
                </Text>
              ) : null}
            </View>
            <Button title="Quét lại" iconName="scan-outline" variant="ghost" onPress={handleScan} loading={scanning} style={styles.rescan} />
          </View>
        ) : null}

        <Text style={styles.tip}>
          {viewMode === '3d'
            ? 'Kéo 1 ngón để xoay góc nhìn, dùng 2 ngón để phóng to.'
            : placements.length === 0
              ? 'Bấm "Thêm đồ" để đặt nội thất vào phòng.'
              : 'Kéo để di chuyển, dùng 2 ngón để phóng to và xoay. Chạm vào chỗ trống để bỏ chọn.'}
        </Text>

        {aiNote ? (
          <View style={styles.aiNote}>
            <Ionicons name="sparkles" size={16} color={COLORS.accent} />
            <Text style={styles.aiNoteText}>{aiNote}</Text>
            <Pressable onPress={(): void => setAiNote(null)} hitSlop={8} accessibilityLabel="Ẩn gợi ý">
              <Ionicons name="close" size={16} color={COLORS.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        <Pressable
          style={styles.quoteBar}
          onPress={(): void => setQuoteOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Xem báo giá"
        >
          <View style={styles.quoteText}>
            <Text style={styles.quoteLabel}>
              {placements.length} món{floorPlan ? ` · ${formatArea(quote.floorArea ?? 0)} sàn` : ''}
            </Text>
            <Text style={styles.quoteValue}>{quote.total > 0 ? formatPrice(quote.total) : 'Chưa có giá'}</Text>
          </View>
          <View style={styles.quoteMore}>
            <Text style={styles.quoteMoreText}>Báo giá</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
          </View>
        </Pressable>
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

      {/* ===== Thanh cong cu duoi ===== */}
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

      {floorPlan ? (
        <RoomSizeEditor
          visible={sizeEditorOpen}
          floorPlan={floorPlan}
          onClose={(): void => setSizeEditorOpen(false)}
          onSave={handleSaveRoomSize}
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
    </View>
  );
}

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1, overflow: 'hidden', paddingTop: SPACING.sm, paddingBottom: SPACING.lg },
  headerSave: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  headerSaveDisabled: { color: COLORS.inactive },
  frameWrap: { marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden' },
  frame: { width: '100%', backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  materialSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  materialDots: { flexDirection: 'row', gap: 4 },
  materialDot: { width: 26, height: 26, borderRadius: RADIUS.sm, overflow: 'hidden' },
  materialDotImage: { width: '100%', height: '100%' },
  materialSummaryText: { flex: 1, gap: 1 },
  materialSummaryLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  materialSummaryValue: { fontSize: 12, color: COLORS.textPrimary },
  materialChange: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  materialChangeText: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  noPlan: {
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  noPlanText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  planInfoTextWrap: { flex: 1, gap: 2 },
  sizeButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  planInfoDim: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  planInfoDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  rescan: { height: 36, paddingHorizontal: SPACING.sm },
  noImage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
  noImageText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  tip: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, paddingHorizontal: SPACING.md },
  aiNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  aiNoteText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  selectedBar: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  selectedName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  selectedActions: { flexDirection: 'row', justifyContent: 'space-between' },
  tool: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: RADIUS.sm },
  toolPressed: { backgroundColor: COLORS.surfaceAlt },
  toolLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  toolDanger: { color: COLORS.danger },
  quoteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quoteText: { gap: 1 },
  quoteLabel: { fontSize: 11, color: COLORS.textSecondary },
  quoteValue: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  quoteMore: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  quoteMoreText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  toolbar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  toolbarButton: { flex: 1, paddingHorizontal: SPACING.sm },
});
