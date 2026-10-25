/**
 * src/components/editor/PlacedItem.tsx
 * 1 mon do dat tren anh phong trong trinh chinh sua 2D.
 *
 * Cu chi (react-native-gesture-handler + reanimated, chay muot tren UI thread):
 *   - cham 1 lan : chon mon do
 *   - keo 1 ngon : di chuyen
 *   - chum 2 ngon: phong to / thu nho
 *   - xoay 2 ngon: xoay
 * Keo/xoay/phong to xong -> bao ve man hinh cha (onChange) gia tri moi
 * theo don vi cua FurniturePlacement (x, y ti le 0..1; rotation do; scale).
 *
 * Hien thi 2D tam thoi: o vuong mau cam + icon danh muc + ten
 * (chua co anh PNG/model 3D cua noi that). Ban 3D se thay phan hien thi nay.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { COLORS, RADIUS } from '@/constants/colors';
import { getCategoryIcon } from '@/constants/furniture';
import type { Furniture, FurniturePlacement } from '@/types';

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 3;

export interface FrameSize {
  width: number;
  height: number;
}

type PlacementPatch = Pick<FurniturePlacement, 'x' | 'y' | 'rotation' | 'scale'>;

interface PlacedItemProps {
  placement: FurniturePlacement;
  furniture: Furniture | undefined;
  frame: FrameSize;
  /** Kich thuoc (px) khi scale = 1. Bo trong = uoc luong theo anh phong (baseSizeOf) */
  size?: { w: number; h: number };
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: PlacementPatch) => void;
}

/**
 * Kich thuoc mac dinh (px) cua mon do khi scale = 1: ti le theo be rong that (cm),
 * gia su be ngang anh phong ~ 4m. Gioi han de do nho van bam duoc, do lon khong che het anh.
 */
export const baseSizeOf = (furniture: Furniture | undefined, frame: FrameSize): { w: number; h: number } => {
  const widthCm = furniture?.width ?? 100;
  const heightCm = furniture?.height ?? 80;
  const w = frame.width * Math.min(0.6, Math.max(0.14, widthCm / 400));
  const h = w * Math.min(1.6, Math.max(0.35, heightCm / widthCm));
  return { w, h };
};

const clampWorklet = (v: number, min: number, max: number): number => {
  'worklet';
  return Math.min(max, Math.max(min, v));
};

const PlacedItem: React.FC<PlacedItemProps> = ({ placement, furniture, frame, size, selected, onSelect, onChange }) => {
  const { w, h } = size ?? baseSizeOf(furniture, frame);

  // Gia tri dang hien thi (px / radian), cap nhat lien tuc khi dang keo
  const cx = useSharedValue(placement.x * frame.width);
  const cy = useSharedValue(placement.y * frame.height);
  const scale = useSharedValue(placement.scale);
  const rotation = useSharedValue((placement.rotation * Math.PI) / 180);
  // Gia tri luc bat dau cu chi
  const start = useSharedValue({ cx: 0, cy: 0, scale: 1, rotation: 0 });

  // Du lieu doi tu ben ngoai (AI goi y, nut xoay/phong to, khung anh doi kich thuoc) -> dong bo lai
  useEffect(() => {
    cx.value = placement.x * frame.width;
    cy.value = placement.y * frame.height;
    scale.value = placement.scale;
    rotation.value = (placement.rotation * Math.PI) / 180;
  }, [placement.x, placement.y, placement.scale, placement.rotation, frame.width, frame.height, cx, cy, scale, rotation]);

  const id = placement.id;
  const frameW = frame.width;
  const frameH = frame.height;

  const commit = (): void => {
    'worklet';
    runOnJS(onChange)(id, {
      x: clampWorklet(cx.value / frameW, 0, 1),
      y: clampWorklet(cy.value / frameH, 0, 1),
      scale: scale.value,
      rotation: Math.round(((rotation.value * 180) / Math.PI) % 360),
    });
  };

  const saveStart = (): void => {
    'worklet';
    start.value = { cx: cx.value, cy: cy.value, scale: scale.value, rotation: rotation.value };
  };

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)(id);
  });

  const pan = Gesture.Pan()
    .onStart(() => {
      saveStart();
      runOnJS(onSelect)(id);
    })
    .onUpdate((e) => {
      // Tam mon do khong ra ngoai khung anh
      cx.value = clampWorklet(start.value.cx + e.translationX, 0, frameW);
      cy.value = clampWorklet(start.value.cy + e.translationY, 0, frameH);
    })
    .onEnd(commit);

  const pinch = Gesture.Pinch()
    .onStart(saveStart)
    .onUpdate((e) => {
      scale.value = clampWorklet(start.value.scale * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(commit);

  const rotate = Gesture.Rotation()
    .onStart(saveStart)
    .onUpdate((e) => {
      rotation.value = start.value.rotation + e.rotation;
    })
    .onEnd(commit);

  const gesture = Gesture.Simultaneous(pan, pinch, rotate, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cx.value - w / 2 },
      { translateY: cy.value - h / 2 },
      { rotate: `${rotation.value}rad` },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.item, { width: w, height: h }, selected && styles.selected, animatedStyle]}
        accessibilityLabel={furniture?.name ?? 'Món đồ'}
      >
        {furniture?.thumbnailUrl ? (
          <Image source={{ uri: furniture.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
        ) : (
          <>
            <Ionicons name={getCategoryIcon(furniture?.category ?? '')} size={Math.max(10, Math.min(w, h) * 0.4)} color={COLORS.textPrimary} />
            <Text style={styles.label} numberOfLines={1}>
              {furniture?.name ?? 'Món đồ'}
            </Text>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(230,126,34,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    padding: 4,
  },
  selected: { borderColor: COLORS.textPrimary, borderWidth: 2.5, borderStyle: 'dashed' },
  label: { fontSize: 10, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2, textAlign: 'center' },
});

export default PlacedItem;
