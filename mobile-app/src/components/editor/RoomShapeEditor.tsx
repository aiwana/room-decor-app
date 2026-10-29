/**
 * src/components/editor/RoomShapeEditor.tsx
 * Che do "SUA PHONG" (toan man hinh, tach khoi luc dat noi that de khong bam nham):
 *   - keo cham tron de doi goc tuong (tu hit ve luoi 5cm va thang hang voi goc ke ben)
 *   - cham 1 buc tuong: nhap chieu dai chinh xac, them goc o giua, them cua ra vao / cua so
 *   - cham 1 goc: xoa goc
 *   - cham 1 cua: doi loai, doi be rong, dich trai / phai, xoa
 *   - chieu cao tran
 * Bam "Lưu" -> tra ve tuong + cua da chuan hoa (goc tren trai = 0,0) cho man hinh cha gui len backend.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/common/Button';
import { DOOR_COLOR, WINDOW_COLOR } from '@/components/design/FloorPlanBackground';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { getErrorMessage } from '@/services/api-error';
import type { FloorPlan, Opening, Wall } from '@/types';
import {
  floorPlanPolygon,
  isSelfIntersecting,
  normalizePolygon,
  openingsToWallOpenings,
  polygonBounds,
  polygonToWalls,
  reattachOpenings,
  removeCorner,
  round2,
  setWallLength,
  splitWall,
  wallAt,
  wallLength,
  wallOpeningCenter,
  wallOpeningToOpening,
  type Point,
  type WallOpening,
} from '@/utils/room-geometry';

export interface RoomShapeResult {
  roomWidth: number;
  roomDepth: number;
  ceilingHeight: number;
  walls: Wall[];
  openings: Opening[];
  /** Phong da dich bao nhieu met de goc tren trai ve 0,0 (noi that dich theo) */
  shift: Point;
}

interface RoomShapeEditorProps {
  visible: boolean;
  floorPlan: FloorPlan;
  onClose: () => void;
  onSave: (result: RoomShapeResult) => Promise<void>;
}

type Selection = { kind: 'corner' | 'wall' | 'opening'; index: number } | null;

interface View2D {
  scale: number; // px moi met
  offX: number;
  offY: number;
}

const GRID = 0.05; // hit ve luoi 5cm
const ALIGN = 0.15; // gan goc ke ben duoi 15cm thi cho thang hang (goc vuong)
const PAD = 40; // le khung ve (px)
const HANDLE = 30;
const MIN_WALL = 0.1;
const MIN_SIDE = 0.5;
const MAX_SIDE = 50;
const MIN_CEILING = 1;
const MAX_CEILING = 10;
const DEFAULT_WIDTH = { door: 0.8, window: 1.2 } as const;
const MOVE_STEP = 0.1;

const parseMeters = (raw: string): number | null => {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

const fmt = (v: number): string => String(Number(v.toFixed(2)));

const fitView = (points: Point[], w: number, h: number): View2D => {
  const { minX, minY, maxX, maxY } = polygonBounds(points);
  const bw = Math.max(maxX - minX, 0.5);
  const bh = Math.max(maxY - minY, 0.5);
  const scale = Math.max(1, Math.min((w - 2 * PAD) / bw, (h - 2 * PAD) / bh));
  return {
    scale,
    offX: PAD + (w - 2 * PAD - bw * scale) / 2 - minX * scale,
    offY: PAD + (h - 2 * PAD - bh * scale) / 2 - minY * scale,
  };
};

/** Lam tron ve luoi 5cm, roi cho thang hang voi 2 goc ke ben neu gan */
const snapCorner = (p: Point, points: Point[], i: number): Point => {
  let x = Math.round(p.x / GRID) * GRID;
  let y = Math.round(p.y / GRID) * GRID;
  const n = points.length;
  for (const k of [(i - 1 + n) % n, (i + 1) % n]) {
    if (Math.abs(points[k].x - p.x) < ALIGN) x = points[k].x;
    if (Math.abs(points[k].y - p.y) < ALIGN) y = points[k].y;
  }
  return { x: round2(x), y: round2(y) };
};

/* ------------------------------- Cham goc keo duoc ------------------------------- */

interface CornerHandleProps {
  index: number;
  point: Point;
  view: View2D;
  selected: boolean;
  onDragStart: (index: number) => void;
  onDrag: (index: number, dxMeters: number, dyMeters: number) => void;
  onDragEnd: () => void;
}

const CornerHandle: React.FC<CornerHandleProps> = ({ index, point, view, selected, onDragStart, onDrag, onDragEnd }) => {
  const gesture = useMemo(
    () =>
      Gesture.Exclusive(
        Gesture.Pan()
          .runOnJS(true)
          .minDistance(2)
          .onStart(() => onDragStart(index))
          .onUpdate((e) => onDrag(index, e.translationX / view.scale, e.translationY / view.scale))
          .onEnd(onDragEnd),
        Gesture.Tap()
          .runOnJS(true)
          .onEnd(() => onDragStart(index)),
      ),
    [index, view.scale, onDragStart, onDrag, onDragEnd],
  );
  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.handle,
          selected && styles.handleSelected,
          { left: point.x * view.scale + view.offX - HANDLE / 2, top: point.y * view.scale + view.offY - HANDLE / 2 },
        ]}
        accessibilityLabel={`Góc ${index + 1}`}
        hitSlop={10}
      >
        <Text style={styles.handleText}>{index + 1}</Text>
      </View>
    </GestureDetector>
  );
};

/* ------------------------------- Man hinh chinh ------------------------------- */

const RoomShapeEditor: React.FC<RoomShapeEditorProps> = ({ visible, floorPlan, onClose, onSave }) => {
  const [points, setPoints] = useState<Point[]>([]);
  const [openings, setOpenings] = useState<WallOpening[]>([]);
  const [ceiling, setCeiling] = useState('');
  const [selection, setSelection] = useState<Selection>(null);
  const [lengthInput, setLengthInput] = useState('');
  const [widthInput, setWidthInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View2D | null>(null);
  // Goc luc bat dau keo (toa do met). Dung ref de cu chi khong bi tao lai giua luc keo
  const dragStartRef = useRef<Point | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  // Mo len: lay hinh dang phong hien tai
  useEffect(() => {
    if (!visible) return;
    const poly = floorPlanPolygon(floorPlan);
    setPoints(poly);
    setOpenings(openingsToWallOpenings(floorPlan.openings ?? [], poly));
    setCeiling(fmt(floorPlan.ceilingHeight));
    setSelection(null);
    setError(null);
    setView(null);
  }, [visible, floorPlan]);

  // Co kich thuoc khung ve -> canh cho vua man hinh (1 lan, hoac khi bam "Vừa màn hình")
  useEffect(() => {
    if (visible && !view && canvas.w > 0 && points.length >= 3) setView(fitView(points, canvas.w, canvas.h));
  }, [visible, view, canvas, points]);

  const select = (next: Selection): void => {
    setSelection(next);
    setError(null);
    if (next?.kind === 'wall') setLengthInput(fmt(wallLength(points, next.index)));
    if (next?.kind === 'opening') setWidthInput(fmt(openings[next.index]?.width ?? 0));
  };

  /* ---------- Keo goc ---------- */
  const onDragStart = useCallback((i: number): void => {
    dragStartRef.current = pointsRef.current[i] ?? null;
    setSelection({ kind: 'corner', index: i });
    setError(null);
  }, []);
  const onDrag = useCallback((i: number, dx: number, dy: number): void => {
    const start = dragStartRef.current;
    if (!start) return;
    setPoints((prev) => {
      const next = [...prev];
      next[i] = snapCorner({ x: start.x + dx, y: start.y + dy }, prev, i);
      return next;
    });
  }, []);
  const onDragEnd = useCallback((): void => {
    dragStartRef.current = null;
  }, []);

  /* ---------- Thao tac tren tuong ---------- */
  const applyLength = (): void => {
    if (selection?.kind !== 'wall') return;
    const len = parseMeters(lengthInput);
    if (len === null || len < MIN_WALL || len > MAX_SIDE) {
      setError(`Chiều dài tường phải từ ${MIN_WALL} đến ${MAX_SIDE} m.`);
      return;
    }
    setPoints((prev) => setWallLength(prev, selection.index, len));
    setError(null);
  };

  const addCorner = (): void => {
    if (selection?.kind !== 'wall') return;
    const next = splitWall(points, selection.index);
    setOpenings((prev) => reattachOpenings(prev, points, next));
    setPoints(next);
    select({ kind: 'corner', index: selection.index + 1 });
  };

  const addOpening = (type: WallOpening['type']): void => {
    if (selection?.kind !== 'wall') return;
    const width = Math.min(DEFAULT_WIDTH[type], wallLength(points, selection.index));
    const next = [...openings, { type, wall: selection.index, t: 0.5, width }];
    setOpenings(next);
    setSelection({ kind: 'opening', index: next.length - 1 });
    setWidthInput(fmt(width));
    setError(null);
  };

  /* ---------- Thao tac tren goc ---------- */
  const deleteCorner = (): void => {
    if (selection?.kind !== 'corner' || points.length <= 3) return;
    const next = removeCorner(points, selection.index);
    setOpenings((prev) => reattachOpenings(prev, points, next));
    setPoints(next);
    setSelection(null);
  };

  /* ---------- Thao tac tren cua ---------- */
  const patchOpening = (patch: (o: WallOpening) => Partial<WallOpening>): void => {
    if (selection?.kind !== 'opening') return;
    setOpenings((prev) => prev.map((o, k) => (k === selection.index ? { ...o, ...patch(o) } : o)));
  };

  const applyOpeningWidth = (): void => {
    const w = parseMeters(widthInput);
    if (w === null || w < 0.2 || w > 10) {
      setError('Bề rộng cửa phải từ 0.2 đến 10 m.');
      return;
    }
    patchOpening(() => ({ width: w }));
    setError(null);
  };

  const moveOpening = (direction: 1 | -1): void =>
    patchOpening((o) => {
      const len = wallLength(points, o.wall) || 1;
      return { t: Math.min(1, Math.max(0, o.t + (direction * MOVE_STEP) / len)) };
    });

  const deleteOpening = (): void => {
    if (selection?.kind !== 'opening') return;
    setOpenings((prev) => prev.filter((_, k) => k !== selection.index));
    setSelection(null);
  };

  /* ---------- Luu ---------- */
  const handleSave = async (): Promise<void> => {
    const ceilingHeight = parseMeters(ceiling);
    if (ceilingHeight === null || ceilingHeight < MIN_CEILING || ceilingHeight > MAX_CEILING) {
      setError(`Chiều cao trần phải từ ${MIN_CEILING} đến ${MAX_CEILING} m.`);
      return;
    }
    if (points.some((_, i) => wallLength(points, i) < MIN_WALL)) {
      setError('Có bức tường quá ngắn (dưới 10 cm). Hãy xoá bớt góc thừa.');
      return;
    }
    if (isSelfIntersecting(points)) {
      setError('Các bức tường đang cắt nhau. Hãy kéo lại các góc cho đúng hình phòng.');
      return;
    }
    const norm = normalizePolygon(points);
    if (norm.width < MIN_SIDE || norm.depth < MIN_SIDE || norm.width > MAX_SIDE || norm.depth > MAX_SIDE) {
      setError(`Phòng phải rộng và dài từ ${MIN_SIDE} đến ${MAX_SIDE} m.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        roomWidth: norm.width,
        roomDepth: norm.depth,
        ceilingHeight,
        walls: polygonToWalls(norm.points),
        openings: openings.map((o) => wallOpeningToOpening(o, norm.points)),
        shift: norm.shift,
      });
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const toPx = (p: Point): Point => (view ? { x: p.x * view.scale + view.offX, y: p.y * view.scale + view.offY } : p);
  const selectedOpening = selection?.kind === 'opening' ? openings[selection.index] : undefined;
  const onCanvasLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    setCanvas({ w: width, h: height });
    setView(null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Modal la cua so rieng tren Android -> can GestureHandlerRootView de keo goc duoc */}
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
                <Text style={styles.headerCancel}>Huỷ</Text>
              </Pressable>
              <Text style={styles.title}>Sửa phòng</Text>
              <Pressable onPress={(): void => void handleSave()} disabled={saving} hitSlop={10} accessibilityRole="button">
                <Text style={[styles.headerSave, saving && styles.headerSaveDisabled]}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
              </Pressable>
            </View>

            {/* ===== Khung ve ===== */}
            <View style={styles.canvas} onLayout={onCanvasLayout}>
              {view ? (
                <>
                  <Svg width={canvas.w} height={canvas.h} style={StyleSheet.absoluteFill}>
                    <Polygon
                      points={points.map((p) => `${toPx(p).x},${toPx(p).y}`).join(' ')}
                      fill="rgba(230,126,34,0.18)"
                      onPress={(): void => select(null)}
                    />
                    {points.map((_, i) => {
                      const [a, b] = wallAt(points, i).map(toPx);
                      const isSel = selection?.kind === 'wall' && selection.index === i;
                      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                      return (
                        <React.Fragment key={`w${i}`}>
                          <Line
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            stroke={isSel ? COLORS.accent : COLORS.textPrimary}
                            strokeWidth={isSel ? 6 : 4}
                            strokeLinecap="round"
                          />
                          {/* Vung cham rong hon net ve de de bam trung tuong */}
                          <Line
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            stroke="rgba(0,0,0,0.01)"
                            strokeWidth={28}
                            onPress={(): void => select({ kind: 'wall', index: i })}
                          />
                          <SvgText
                            x={mid.x}
                            y={mid.y - 8}
                            fontSize={12}
                            fontWeight="bold"
                            fill={isSel ? COLORS.accent : COLORS.textSecondary}
                            textAnchor="middle"
                          >
                            {`${wallLength(points, i).toFixed(2)} m`}
                          </SvgText>
                        </React.Fragment>
                      );
                    })}
                    {openings.map((o, i) => {
                      const line = wallOpeningToOpening(o, points);
                      const a = toPx({ x: line.x1, y: line.y1 });
                      const b = toPx({ x: line.x2, y: line.y2 });
                      const isSel = selection?.kind === 'opening' && selection.index === i;
                      const c = toPx(wallOpeningCenter(o, points));
                      return (
                        <React.Fragment key={`o${i}`}>
                          <Line
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            stroke={o.type === 'door' ? DOOR_COLOR : WINDOW_COLOR}
                            strokeWidth={isSel ? 12 : 9}
                            onPress={(): void => select({ kind: 'opening', index: i })}
                          />
                          {isSel ? <Circle cx={c.x} cy={c.y} r={4} fill={COLORS.textPrimary} /> : null}
                        </React.Fragment>
                      );
                    })}
                  </Svg>
                  {points.map((p, i) => (
                    <CornerHandle
                      key={`c${i}`}
                      index={i}
                      point={p}
                      view={view}
                      selected={selection?.kind === 'corner' && selection.index === i}
                      onDragStart={onDragStart}
                      onDrag={onDrag}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                  <Pressable
                    style={styles.fitBtn}
                    onPress={(): void => setView(fitView(points, canvas.w, canvas.h))}
                    accessibilityRole="button"
                    accessibilityLabel="Vừa màn hình"
                  >
                    <Ionicons name="scan-outline" size={16} color={COLORS.textPrimary} />
                    <Text style={styles.fitText}>Vừa màn hình</Text>
                  </Pressable>
                  <View style={styles.legend} pointerEvents="none">
                    <View style={[styles.legendDot, { backgroundColor: DOOR_COLOR }]} />
                    <Text style={styles.legendText}>Cửa ra vào</Text>
                    <View style={[styles.legendDot, { backgroundColor: WINDOW_COLOR }]} />
                    <Text style={styles.legendText}>Cửa sổ</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* ===== Bang sua theo doi tuong dang chon ===== */}
            <View style={styles.panel}>
              {selection?.kind === 'wall' ? (
                <>
                  <Text style={styles.panelTitle}>Tường {selection.index + 1}</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.input}
                        value={lengthInput}
                        onChangeText={setLengthInput}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        accessibilityLabel="Chiều dài tường"
                        onSubmitEditing={applyLength}
                      />
                      <Text style={styles.unit}>m</Text>
                    </View>
                    <Button title="Đặt chiều dài" onPress={applyLength} style={styles.inlineBtn} />
                  </View>
                  <View style={styles.actionRow}>
                    <SmallAction icon="git-commit-outline" label="Thêm góc" onPress={addCorner} />
                    <SmallAction icon="enter-outline" label="Thêm cửa" onPress={(): void => addOpening('door')} />
                    <SmallAction icon="browsers-outline" label="Thêm cửa sổ" onPress={(): void => addOpening('window')} />
                  </View>
                </>
              ) : selection?.kind === 'corner' ? (
                <>
                  <Text style={styles.panelTitle}>Góc {selection.index + 1}</Text>
                  <Text style={styles.hint}>Kéo chấm tròn để di chuyển góc. Góc tự thẳng hàng với góc bên cạnh khi kéo gần.</Text>
                  <View style={styles.actionRow}>
                    <SmallAction
                      icon="trash-outline"
                      label={points.length > 3 ? 'Xoá góc' : 'Cần ít nhất 3 góc'}
                      danger
                      disabled={points.length <= 3}
                      onPress={deleteCorner}
                    />
                  </View>
                </>
              ) : selectedOpening ? (
                <>
                  <View style={styles.typeRow}>
                    {(['door', 'window'] as const).map((type) => (
                      <Pressable
                        key={type}
                        style={[styles.typeChip, selectedOpening.type === type && styles.typeChipActive]}
                        onPress={(): void => patchOpening(() => ({ type }))}
                        accessibilityRole="button"
                      >
                        <Text style={styles.typeChipText}>{type === 'door' ? 'Cửa ra vào' : 'Cửa sổ'}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.inputRow}>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.input}
                        value={widthInput}
                        onChangeText={setWidthInput}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        accessibilityLabel="Bề rộng cửa"
                        onSubmitEditing={applyOpeningWidth}
                      />
                      <Text style={styles.unit}>m</Text>
                    </View>
                    <Button title="Đặt bề rộng" onPress={applyOpeningWidth} style={styles.inlineBtn} />
                  </View>
                  <View style={styles.actionRow}>
                    <SmallAction icon="chevron-back" label="Dịch 10cm" onPress={(): void => moveOpening(-1)} />
                    <SmallAction icon="chevron-forward" label="Dịch 10cm" onPress={(): void => moveOpening(1)} />
                    <SmallAction icon="trash-outline" label="Xoá cửa" danger onPress={deleteOpening} />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.hint}>
                    Kéo chấm tròn để sửa góc phòng. Chạm vào 1 bức tường để nhập chiều dài thật hoặc thêm cửa; chạm vào cửa để sửa.
                  </Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.label}>Chiều cao trần</Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.input}
                        value={ceiling}
                        onChangeText={setCeiling}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        accessibilityLabel="Chiều cao trần"
                      />
                      <Text style={styles.unit}>m</Text>
                    </View>
                  </View>
                </>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
};

interface SmallActionProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}

const SmallAction: React.FC<SmallActionProps> = ({ icon, label, onPress, danger, disabled }) => (
  <Pressable
    style={({ pressed }) => [styles.action, pressed && styles.actionPressed, disabled && styles.actionDisabled]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.textPrimary} />
    <Text style={[styles.actionText, danger && styles.actionDanger]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCancel: { fontSize: 15, color: COLORS.textSecondary },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  headerSave: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  headerSaveDisabled: { color: COLORS.inactive },
  canvas: { flex: 1, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.textPrimary },
  handleText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
  fitBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.overlay,
  },
  fitText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  legend: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 14, height: 5, borderRadius: 2 },
  legendText: { fontSize: 11, color: COLORS.textSecondary, marginRight: 8 },
  panel: {
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  panelTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  hint: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: { flex: 1, fontSize: 16, color: COLORS.textPrimary, paddingVertical: 0 },
  unit: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 4 },
  inlineBtn: { height: 44, paddingHorizontal: SPACING.md },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  action: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt },
  actionPressed: { opacity: 0.7 },
  actionDisabled: { opacity: 0.4 },
  actionText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  actionDanger: { color: COLORS.danger },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  typeChipText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  error: { fontSize: 12, lineHeight: 17, color: COLORS.danger },
});

export default RoomShapeEditor;
