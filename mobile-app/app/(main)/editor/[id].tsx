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
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
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
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { useAsync } from '@/hooks/useAsync';
import { aiApi } from '@/services/ai-api';
import { getErrorMessage } from '@/services/api-error';
import { designApi } from '@/services/design-api';
import { floorPlanApi } from '@/services/floor-plan-api';
import { furnitureApi } from '@/services/furniture-api';
import type { DesignDetail, FloorPlan, Furniture, FurniturePlacement, IoniconName } from '@/types';
import { clamp, createId, firstParam } from '@/utils';

/** Ti le khung anh mac dinh khi chua biet kich thuoc anh */
const DEFAULT_RATIO = 4 / 3;
const SCALE_STEP = 1.15;
const CM_PER_M = 100;
/** Mon do nho nhat tren mat bang (px) de van bam duoc */
const MIN_PLAN_ITEM = 14;

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
      await designApi.savePlacements(design.id, placements);
      setDirty(false);
    } catch (e) {
      Alert.alert('Không lưu được thiết kế', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
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

      <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={!selectedId && viewMode !== '3d'}>
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

        {/* ===== Khung anh phong / mat bang / 3D + do ===== */}
        <View style={styles.frameWrap} onLayout={onLayout}>
          {containerWidth > 0 && viewMode === 'photo' ? (
            <Pressable
              style={[styles.frame, { height: photoFrame.height }]}
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
            </Pressable>
          ) : null}

          {containerWidth > 0 && viewMode === 'plan' && floorPlan && planFrame ? (
            <Pressable
              style={[styles.frame, { height: planFrame.height }]}
              onPress={(): void => setSelectedId(null)}
              accessibilityLabel="Mặt bằng 2D của phòng"
            >
              <FloorPlanBackground floorPlan={floorPlan} width={planFrame.width} height={planFrame.height} />
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
            </Pressable>
          ) : null}

          {containerWidth > 0 && viewMode === '3d' && floorPlan ? (
            <View style={[styles.frame, { height: containerWidth }]}>
              <View3D floorPlan={floorPlan} placements={placements} furnitureById={furnitureById} />
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
            <Text style={styles.planInfoText}>
              {`Phòng ${floorPlan.roomWidth.toFixed(1)} × ${floorPlan.roomDepth.toFixed(1)} m, trần ${floorPlan.ceilingHeight.toFixed(1)} m`}
              {floorPlan.description ? `\n${floorPlan.description}` : ''}
            </Text>
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

        {/* ===== Thanh dieu khien mon dang chon ===== */}
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

        <Text style={styles.count}>{placements.length} món đồ trong thiết kế</Text>
      </ScrollView>

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
  scrollContent: { paddingTop: SPACING.sm, paddingBottom: SPACING.lg },
  headerSave: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  headerSaveDisabled: { color: COLORS.inactive },
  frameWrap: { marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden' },
  frame: { width: '100%', backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
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
  planInfoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  rescan: { paddingHorizontal: SPACING.sm },
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
  count: { fontSize: 12, color: COLORS.inactive, textAlign: 'center', marginTop: SPACING.md },
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
