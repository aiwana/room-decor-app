/**
 * src/components/common/Skeleton.tsx
 * Khung xam nhap nhay giu cho trong luc tai (thay vong xoay giua man hinh):
 * nguoi dung thay truoc bo cuc se hien, man hinh khong "nhay" khi du lieu ve.
 * Tat hieu ung nhap nhay khi may bat "Giam chuyen dong".
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 14, radius = RADIUS.sm, style }) => {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    if (reduced) return;
    opacity.value = withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity, reduced]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: radius }, animated, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
};

/** The thiet ke dang tai (luoi 2 cot hoac danh sach) */
export const DesignCardSkeleton: React.FC<{ variant?: 'grid' | 'list' }> = ({ variant = 'grid' }) =>
  variant === 'list' ? (
    <View style={[styles.card, styles.listCard]}>
      <Skeleton width={72} height={72} />
      <View style={styles.flex}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="40%" height={12} style={styles.gap} />
        <Skeleton width="55%" height={12} style={styles.gap} />
      </View>
    </View>
  ) : (
    <View style={[styles.card, styles.flex]}>
      <Skeleton height={undefined} radius={0} style={styles.gridImage} />
      <View style={styles.info}>
        <Skeleton width="75%" height={14} />
        <Skeleton width="55%" height={12} style={styles.gap} />
      </View>
    </View>
  );

/** Man "Cua toi" dang tai: 3 hang the */
export const DesignListSkeleton: React.FC<{ variant?: 'grid' | 'list' }> = ({ variant = 'grid' }) => (
  <View style={styles.list} accessibilityLabel="Đang tải thiết kế" accessibilityRole="progressbar">
    {[0, 1, 2].map((i) =>
      variant === 'list' ? (
        <View key={i} style={styles.listRow}>
          <DesignCardSkeleton variant="list" />
        </View>
      ) : (
        <View key={i} style={styles.gridRow}>
          <DesignCardSkeleton />
          <DesignCardSkeleton />
        </View>
      ),
    )}
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { backgroundColor: COLORS.surfaceAlt },
  gap: { marginTop: 8 },
  card: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, overflow: 'hidden' },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  gridImage: { width: '100%', aspectRatio: 1.15 },
  info: { padding: 10 },
  list: { paddingHorizontal: SPACING.md },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  listRow: { marginBottom: 10 },
});
