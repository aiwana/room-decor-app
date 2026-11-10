/**
 * src/components/design/DesignThumb.tsx
 * Anh dai dien cua 1 thiet ke, uu tien:
 *   1. anh chup khung 3D (luu khi nguoi dung mo tab 3D trong trinh chinh sua)
 *   2. mat bang thu nho co ca noi that (ve tu tom tat luu tren may, phong trong cung co)
 *   3. anh phong da chup
 *   4. bieu tuong (thiet ke tao tren may khac, chua mo lan nao tren may nay)
 */
import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Polygon, Rect } from 'react-native-svg';

import { COLORS } from '@/constants/colors';
import type { DesignDetail, DesignSummary } from '@/types';

interface DesignThumbProps {
  design: DesignDetail;
  /** Khung anh (kich thuoc do the quyet dinh, mat bang tu do kich thuoc bang onLayout) */
  style: StyleProp<ViewStyle>;
}

const PAD = 10;

const PlanSketch: React.FC<{ summary: DesignSummary; width: number; height: number }> = ({ summary, width, height }) => {
  const k = Math.min((width - 2 * PAD) / summary.roomWidth, (height - 2 * PAD) / summary.roomDepth);
  const ox = (width - summary.roomWidth * k) / 2;
  const oy = (height - summary.roomDepth * k) / 2;
  const pts = summary.polygon.map((p) => `${(ox + p.x * k).toFixed(1)},${(oy + p.y * k).toFixed(1)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polygon points={pts} fill="#2B2A28" stroke={COLORS.textSecondary} strokeWidth={2} strokeLinejoin="round" />
      {summary.items.map((it, i) => (
        <G key={i} rotation={it.rotation} origin={`${ox + it.x * k}, ${oy + it.y * k}`}>
          <Rect
            x={ox + (it.x - it.w / 2) * k}
            y={oy + (it.y - it.d / 2) * k}
            width={Math.max(it.w * k, 2)}
            height={Math.max(it.d * k, 2)}
            rx={1.5}
            fill={COLORS.accentSoft}
            stroke={COLORS.accent}
            strokeWidth={1}
          />
        </G>
      ))}
    </Svg>
  );
};

const DesignThumb: React.FC<DesignThumbProps> = ({ design, style }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Anh 3D > mat bang thu nho > anh chup
  const photo = design.thumbnailUri ?? (design.summary ? null : design.roomImageUri);
  return (
    <View
      style={[style, styles.wrap]}
      onLayout={(e): void => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : design.summary && size.width > 0 ? (
        <PlanSketch summary={design.summary} width={size.width} height={size.height} />
      ) : (
        <Ionicons name="cube-outline" size={28} color={COLORS.inactive} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: COLORS.surfaceAlt },
});

export default DesignThumb;
