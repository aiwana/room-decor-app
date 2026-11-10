/**
 * src/components/design/BlankRoomForm.tsx
 * Tao thiet ke KHONG CAN ANH (cho nguoi chua co phong de chup). Chia 3 buoc ro rang:
 *   "blank":    1. Chon hinh dang (luoi 3 cot: chu nhat, vuong, hep dai, chu L, chu L nguoc, chu U, chu T,
 *                  vat goc, co hoc tuong)  2. Kich thuoc (dai x rong x tran, xem truoc ngay; hoac keo chinh
 *                  truc tiep tren hinh)  3. Dat ten
 *   "template": 1. Chon phong mau (deu hinh chu nhat)  2. Xem truoc (keo chinh duoc)  3. Dat ten
 * Cham vao hinh xem truoc (hoac nut "Kéo chỉnh trên hình") mo trinh "Sửa phòng" (RoomShapeEditor)
 * ngay tai day, chua goi may chu. Bam Tao thiet ke moi:
 *   POST /api/floor-plans/blank -> roomImageId (anh loai "blank") -> POST /api/designs -> /editor/[id].
 */
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Polygon } from 'react-native-svg';

import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import FloorPlanBackground from '@/components/design/FloorPlanBackground';
import RoomTypePicker from '@/components/design/RoomTypePicker';
import { type RoomShapeResult } from '@/components/editor/RoomShapeEditor';
import { COLORS, FONT, RADIUS, SPACING } from '@/constants/colors';
import { DEFAULT_ROOM_TYPE, type RoomType } from '@/constants/room-types';
import { openRoomShapeEditor } from '@/store/room-shape-session';
import {
  CEILING_MAX,
  CEILING_MIN,
  DEFAULT_CEILING,
  ROOM_SHAPES,
  ROOM_SIDE_MAX,
  ROOM_SIDE_MIN,
  ROOM_TEMPLATES,
  shapeRoom,
  type RoomShape,
  type RoomShapeDef,
  type RoomTemplate,
} from '@/constants/room-templates';
import { getErrorMessage } from '@/services/api-error';
import { designApi } from '@/services/design-api';
import { floorPlanApi } from '@/services/floor-plan-api';
import type { FloorPlan } from '@/types';

export type NoPhotoMode = 'blank' | 'template';

interface BlankRoomFormProps {
  mode: NoPhotoMode;
}

const NAME_MAX = 200; // khop cot designs.name VARCHAR(200)
const PREVIEW_HEIGHT = 200;
const PREVIEW_PADDING = 24;
const THUMB_W = 56;
const THUMB_H = 40;

type SizeKey = 'width' | 'depth' | 'ceiling';

const sizesOf = (def: RoomShapeDef): Record<SizeKey, string> => ({
  width: String(def.defaultWidth),
  depth: String(def.defaultDepth),
  ceiling: String(DEFAULT_CEILING),
});

/** "3,5" hoac "3.5" -> 3.5; o trong / sai -> NaN */
const parseMeters = (text: string): number => {
  const t = text.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
};

const fmt = (v: number): string => v.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

/** Dien tich san (cong thuc shoelace) */
const shapeArea = (shape: RoomShape): number => {
  let sum = 0;
  for (const w of shape.walls) sum += w.x1 * w.y2 - w.x2 * w.y1;
  return Math.round(Math.abs(sum / 2) * 100) / 100;
};

/** Kiem tra so do phong trong; tra ve hinh phong hoac danh sach loi theo o nhap */
const buildShape = (
  def: RoomShapeDef,
  sizes: Record<SizeKey, string>,
): { shape: RoomShape | null; errors: Partial<Record<SizeKey, string>> } => {
  const width = parseMeters(sizes.width);
  const depth = parseMeters(sizes.depth);
  const ceiling = sizes.ceiling.trim() ? parseMeters(sizes.ceiling) : DEFAULT_CEILING;
  const errors: Partial<Record<SizeKey, string>> = {};
  const side = (x: number): boolean => x >= ROOM_SIDE_MIN && x <= ROOM_SIDE_MAX;
  if (!side(width)) errors.width = `${fmt(ROOM_SIDE_MIN)}–${ROOM_SIDE_MAX} m`;
  if (!side(depth)) errors.depth = `${fmt(ROOM_SIDE_MIN)}–${ROOM_SIDE_MAX} m`;
  if (!(ceiling >= CEILING_MIN && ceiling <= CEILING_MAX)) errors.ceiling = `${fmt(CEILING_MIN)}–${CEILING_MAX} m`;
  if (Object.keys(errors).length > 0) return { shape: null, errors };
  return { shape: shapeRoom(def, width, depth, ceiling), errors };
};

/** Mat bang tam de ve xem truoc / mo trinh "Sửa phòng" (dung lai FloorPlanBackground) */
const previewPlan = (shape: RoomShape): FloorPlan => ({
  id: 'preview',
  roomImageId: 'preview',
  ...shape,
  pixelsPerMeter: 100,
  createdAt: null,
  updatedAt: null,
  source: 'blank',
});

/* ------------------------------ Thanh phan nho ------------------------------ */

/** Tieu de buoc: so tron + ten + mo ta ngan */
const StepHeader: React.FC<{ n: number; title: string; hint?: string }> = ({ n, title, hint }) => (
  <View style={styles.stepHeader}>
    <View style={styles.stepBadge}>
      <Text style={styles.stepBadgeText}>{n}</Text>
    </View>
    <View style={styles.flex}>
      <Text style={styles.stepTitle} accessibilityRole="header">
        {title}
      </Text>
      {hint ? <Text style={styles.stepHint}>{hint}</Text> : null}
    </View>
  </View>
);

/** Hinh nho cua 1 hinh dang phong (theo ti le 0..1) */
const ShapeThumb: React.FC<{ points: [number, number][]; ratio: number; active: boolean }> = ({
  points,
  ratio,
  active,
}) => {
  const k = Math.min((THUMB_W - 6) / ratio, THUMB_H - 6);
  const w = ratio * k;
  const h = k;
  const ox = (THUMB_W - w) / 2;
  const oy = (THUMB_H - h) / 2;
  const pts = points.map(([x, y]) => `${(ox + x * w).toFixed(1)},${(oy + y * h).toFixed(1)}`).join(' ');
  return (
    <Svg width={THUMB_W} height={THUMB_H}>
      <Polygon
        points={pts}
        fill={active ? COLORS.accentSoft : COLORS.surfaceAlt}
        stroke={active ? COLORS.accent : COLORS.textSecondary}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/** Dau tick goc tren ben phai cua the dang chon */
const CheckBadge: React.FC = () => (
  <View style={styles.checkBadge} pointerEvents="none">
    <Ionicons name="checkmark" size={12} color={COLORS.onAccent} />
  </View>
);

/** Mat bang xem truoc; cham vao de keo chinh */
const RoomPreview: React.FC<{ shape: RoomShape | null; width: number; edited: boolean; onPress?: () => void }> = ({
  shape,
  width,
  edited,
  onPress,
}) => {
  if (!shape || width <= 0) {
    return (
      <View style={[styles.preview, styles.previewEmpty]}>
        <Ionicons name="grid-outline" size={28} color={COLORS.inactive} />
        <Text style={styles.previewEmptyText}>Nhập kích thước hợp lệ để xem trước</Text>
      </View>
    );
  }
  const scale = Math.min(
    (width - 2 * PREVIEW_PADDING) / shape.roomWidth,
    (PREVIEW_HEIGHT - 2 * PREVIEW_PADDING) / shape.roomDepth,
  );
  const w = shape.roomWidth * scale;
  const h = shape.roomDepth * scale;
  return (
    <Pressable
      style={({ pressed }) => [styles.preview, pressed && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Mặt bằng ${fmt(shape.roomWidth)} nhân ${fmt(shape.roomDepth)} mét. Chạm để kéo chỉnh hình dạng`}
    >
      {/* Svg to hon phong 2 * padding de ghi so do phia ngoai tuong (giong trinh chinh sua) */}
      <View style={{ width: w + 2 * PREVIEW_PADDING, height: h + 2 * PREVIEW_PADDING }} pointerEvents="none">
        <FloorPlanBackground floorPlan={previewPlan(shape)} width={w} height={h} padding={PREVIEW_PADDING} />
      </View>
      <View style={[styles.previewTag, styles.previewTagLeft]} pointerEvents="none">
        <Text style={styles.previewTagText}>{`${fmt(shapeArea(shape))} m² · trần ${fmt(shape.ceilingHeight)} m`}</Text>
      </View>
      {edited ? (
        <View style={[styles.previewTag, styles.previewTagEdited]} pointerEvents="none">
          <Ionicons name="create-outline" size={12} color={COLORS.accent} />
          <Text style={[styles.previewTagText, styles.previewTagEditedText]}>Đã chỉnh tay</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

/* --------------------------------- Form chinh --------------------------------- */

/** Phong mau -> loai phong goi y san (nguoi dung van doi duoc) */
const TEMPLATE_ROOM_TYPE: Record<string, RoomType> = {
  bedroom: 'bedroom',
  living: 'living',
  kitchen: 'kitchen',
  office: 'office',
};

const BlankRoomForm: React.FC<BlankRoomFormProps> = ({ mode }) => {
  const router = useRouter();
  const [shapeId, setShapeId] = useState(ROOM_SHAPES[0].id);
  const [sizes, setSizes] = useState(() => sizesOf(ROOM_SHAPES[0]));
  const [showErrors, setShowErrors] = useState(false);
  const [templateId, setTemplateId] = useState(ROOM_TEMPLATES[0].id);
  // Hinh nguoi dung da keo chinh trong "Sửa phòng" (thay cho hinh dang + so do o tren)
  const [custom, setCustom] = useState<RoomShape | null>(null);
  const [name, setName] = useState('');
  // null = chua tu chon -> dung loai goi y theo phong mau
  const [pickedType, setPickedType] = useState<RoomType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const busyRef = useRef(false);

  const shapeDef = ROOM_SHAPES.find((d) => d.id === shapeId) ?? ROOM_SHAPES[0];
  const template = ROOM_TEMPLATES.find((t) => t.id === templateId) ?? ROOM_TEMPLATES[0];
  const built = useMemo(() => buildShape(shapeDef, sizes), [shapeDef, sizes]);
  const baseShape = mode === 'template' ? template.shape : built.shape;
  const shape = custom ?? baseShape;
  const errors = mode === 'blank' && (showErrors || !built.shape) && !custom ? built.errors : {};
  const defaultName =
    mode === 'template'
      ? `${template.name} mẫu`
      : shapeDef.id === 'rect'
        ? 'Phòng trống'
        : `Phòng trống ${shapeDef.name.toLowerCase()}`;

  const roomType: RoomType =
    pickedType ?? (mode === 'template' ? (TEMPLATE_ROOM_TYPE[template.id] ?? DEFAULT_ROOM_TYPE) : DEFAULT_ROOM_TYPE);

  const setSize = (key: SizeKey) => (text: string): void => setSizes((prev) => ({ ...prev, [key]: text }));

  const chooseShape = (def: RoomShapeDef): void => {
    setShapeId(def.id);
    setSizes(sizesOf(def));
    setCustom(null);
    setShowErrors(false);
  };

  const chooseTemplate = (t: RoomTemplate): void => {
    setTemplateId(t.id);
    setCustom(null);
    setPickedType(null);
  };

  const openEditor = (): void => {
    if (!shape) {
      setShowErrors(true);
      return;
    }
    // Man hinh rieng (khong dung Modal - xem app/(main)/room-shape.tsx)
    openRoomShapeEditor(router, { floorPlan: previewPlan(shape), onSave: saveCustom });
  };

  const saveCustom = async (r: RoomShapeResult): Promise<void> => {
    setCustom({
      roomWidth: r.roomWidth,
      roomDepth: r.roomDepth,
      ceilingHeight: r.ceilingHeight,
      walls: r.walls,
      openings: r.openings,
    });
  };

  const handleCreate = async (): Promise<void> => {
    if (busyRef.current) return;
    if (!shape) {
      setShowErrors(true);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const plan = await floorPlanApi.createBlank(shape);
      const design = await designApi.create({
        name: (name.trim() || defaultName).slice(0, NAME_MAX),
        roomImageId: plan.roomImageId,
        roomImageUri: '',
        roomType,
      });
      setName('');
      setPickedType(null);
      router.push({ pathname: '/editor/[id]', params: { id: design.id } });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const previewBlock = (
    <>
      <View onLayout={(e): void => setPreviewWidth(e.nativeEvent.layout.width)}>
        <RoomPreview shape={shape} width={previewWidth} edited={!!custom} onPress={busy ? undefined : openEditor} />
      </View>
      <View style={styles.editRow}>
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          onPress={openEditor}
          disabled={busy}
          accessibilityRole="button"
        >
          <Ionicons name="hand-left-outline" size={18} color={COLORS.accent} />
          <Text style={styles.editBtnText}>{custom ? 'Kéo chỉnh tiếp' : 'Kéo chỉnh trên hình'}</Text>
        </Pressable>
        {custom ? (
          <Pressable
            style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
            onPress={(): void => setCustom(null)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={mode === 'template' ? 'Quay lại phòng mẫu ban đầu' : 'Bỏ chỉnh tay, quay lại số đo'}
          >
            <Ionicons name="refresh-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.resetText}>Hoàn tác</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={styles.wrap}>
      {mode === 'blank' ? (
        <>
          {/* ===== Buoc 1: hinh dang ===== */}
          <View style={styles.card}>
            <StepHeader n={1} title="Chọn hình dạng" hint="Gần giống phòng của bạn là được, sửa chi tiết ở bước sau" />
            <View style={styles.shapeGrid} accessibilityRole="radiogroup">
              {ROOM_SHAPES.map((d) => {
                const active = d.id === shapeId;
                return (
                  <Pressable
                    key={d.id}
                    style={({ pressed }) => [styles.shapeTile, active && styles.tileActive, pressed && styles.pressed]}
                    onPress={(): void => chooseShape(d)}
                    disabled={busy}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled: busy }}
                    accessibilityLabel={d.name}
                  >
                    <ShapeThumb points={d.points} ratio={d.defaultWidth / d.defaultDepth} active={active} />
                    <Text style={[styles.shapeName, active && styles.shapeNameActive]} numberOfLines={1}>
                      {d.name}
                    </Text>
                    {active ? <CheckBadge /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ===== Buoc 2: kich thuoc + xem truoc ===== */}
          <View style={styles.card}>
            <StepHeader n={2} title="Kích thước" hint="Nhập số đo, hoặc kéo góc tường ngay trên hình" />
            {previewBlock}
            {custom ? (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.accent} />
                <Text style={styles.infoText}>
                  Đang dùng hình bạn kéo chỉnh. Bấm “Hoàn tác” nếu muốn nhập lại số đo.
                </Text>
              </View>
            ) : (
              <View style={styles.sizeRow}>
                <FormField
                  label="Dài (m)"
                  value={sizes.width}
                  onChangeText={setSize('width')}
                  onBlur={(): void => setShowErrors(true)}
                  error={errors.width}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  editable={!busy}
                  selectTextOnFocus
                  containerStyle={styles.flex}
                  style={styles.inputOnCard}
                />
                <FormField
                  label="Rộng (m)"
                  value={sizes.depth}
                  onChangeText={setSize('depth')}
                  onBlur={(): void => setShowErrors(true)}
                  error={errors.depth}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  editable={!busy}
                  selectTextOnFocus
                  containerStyle={styles.flex}
                  style={styles.inputOnCard}
                />
                <FormField
                  label="Trần (m)"
                  value={sizes.ceiling}
                  onChangeText={setSize('ceiling')}
                  onBlur={(): void => setShowErrors(true)}
                  error={errors.ceiling}
                  placeholder="2.7"
                  keyboardType="decimal-pad"
                  maxLength={4}
                  editable={!busy}
                  selectTextOnFocus
                  containerStyle={styles.flex}
                  style={styles.inputOnCard}
                />
              </View>
            )}
            <Text style={styles.footnote}>Có sẵn 1 cửa ra vào. Thêm cửa sổ, dời cửa khi kéo chỉnh trên hình.</Text>
          </View>
        </>
      ) : (
        <>
          {/* ===== Buoc 1: chon phong mau ===== */}
          <View style={styles.card}>
            <StepHeader n={1} title="Chọn phòng mẫu" hint="Đã có sẵn cửa đi và cửa sổ" />
            <View accessibilityRole="radiogroup">
              {ROOM_TEMPLATES.map((t) => {
                const active = t.id === templateId;
                const area = shapeArea(t.shape);
                return (
                  <Pressable
                    key={t.id}
                    style={({ pressed }) => [styles.templateRow, active && styles.tileActive, pressed && styles.pressed]}
                    onPress={(): void => chooseTemplate(t)}
                    disabled={busy}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled: busy }}
                    accessibilityLabel={`${t.name}, ${t.summary}`}
                  >
                    <View style={[styles.templateIcon, active && styles.templateIconActive]}>
                      <Ionicons name={t.icon} size={22} color={active ? COLORS.accent : COLORS.textSecondary} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.templateName}>{t.name}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaChip}>{`${fmt(t.shape.roomWidth)} × ${fmt(t.shape.roomDepth)} m`}</Text>
                        <Text style={styles.metaChip}>{`${fmt(area)} m²`}</Text>
                        <Text style={styles.metaChip}>
                          {`${t.shape.openings.filter((o) => o.type === 'window').length} cửa sổ`}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={active ? COLORS.accent : COLORS.inactive}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ===== Buoc 2: xem truoc ===== */}
          <View style={styles.card}>
            <StepHeader n={2} title="Xem trước" hint="Kéo chỉnh cho giống phòng của bạn, hoặc tạo xong rồi sửa" />
            {previewBlock}
          </View>
        </>
      )}

      {/* ===== Buoc 3: dat ten (buoc cuoi) ===== */}
      <View style={styles.card}>
        <StepHeader n={3} title="Đặt tên và loại phòng" hint="Bỏ trống tên thì dùng tên gợi ý" />
        <FormField
          label="Tên thiết kế"
          value={name}
          onChangeText={setName}
          placeholder={defaultName}
          maxLength={NAME_MAX}
          editable={!busy}
          returnKeyType="done"
          containerStyle={styles.nameField}
          style={styles.inputOnCard}
        />
        <RoomTypePicker value={roomType} onChange={setPickedType} disabled={busy} />
      </View>

      {error ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={18} color={COLORS.dangerText} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Button
        title={busy ? 'Đang tạo phòng...' : 'Tạo thiết kế'}
        iconName="arrow-forward-circle-outline"
        onPress={(): void => void handleCreate()}
        loading={busy}
        disabled={!shape}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.md },
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: SPACING.md },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginTop: 1,
  },
  stepBadgeText: { fontSize: 13, fontFamily: FONT.bold, color: COLORS.onAccent },
  stepTitle: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.textPrimary },
  stepHint: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2 },
  /* Buoc 1: luoi hinh dang 3 cot */
  shapeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  shapeTile: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    minHeight: 84,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tileActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  shapeName: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.textSecondary },
  shapeNameActive: { color: COLORS.textPrimary },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  /* Xem truoc */
  preview: {
    height: PREVIEW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  previewEmpty: { gap: SPACING.sm },
  previewEmptyText: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.textSecondary },
  previewTag: {
    position: 'absolute',
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.overlay,
  },
  previewTagLeft: { left: 8 },
  previewTagEdited: { right: 8, backgroundColor: COLORS.accentSoft },
  previewTagText: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textPrimary },
  previewTagEditedText: { color: COLORS.accent, fontFamily: FONT.bold },
  editRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.md },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  editBtnText: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.accent },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.fill,
  },
  resetText: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.textSecondary },
  sizeRow: { flexDirection: 'row', gap: SPACING.sm },
  inputOnCard: { backgroundColor: COLORS.background },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: 12,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentSoft,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: FONT.regular, color: COLORS.textPrimary },
  footnote: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary },
  /* Phong mau */
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fill,
  },
  templateIconActive: { backgroundColor: COLORS.accentSoft },
  templateName: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.textPrimary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaChip: {
    fontSize: 12, fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.fill,
    overflow: 'hidden',
  },
  nameField: { marginBottom: 0 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.dangerSoft,
    marginBottom: SPACING.md,
  },
  errorText: { flex: 1, color: COLORS.dangerText, fontSize: 13, fontFamily: FONT.regular },
});

export default BlankRoomForm;
