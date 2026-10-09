/**
 * src/components/design/DesignCard.tsx
 * The 1 thiet ke (anh + phong cach + loai phong + ngay).
 * variant 'grid'   -> o History (2 cot, co nut yeu thich + xoa)
 * variant 'compact'-> o Home "Thiet ke gan day" (cuon ngang)
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS } from '@/constants/colors';
import { getRoomTypeLabel, getStyleLabel } from '@/constants/decorOptions';
import type { Design } from '@/types';
import { formatDate } from '@/utils/format';

interface DesignCardProps {
  design: Design;
  variant?: 'grid' | 'compact';
  onPress: (design: Design) => void;
  onToggleFavorite?: (design: Design) => void;
  onDelete?: (design: Design) => void;
}

const DesignCard: React.FC<DesignCardProps> = ({
  design,
  variant = 'grid',
  onPress,
  onToggleFavorite,
  onDelete,
}) => (
  <Pressable
    onPress={(): void => onPress(design)}
    style={({ pressed }) => [styles.card, variant === 'compact' ? styles.compact : styles.grid, pressed && styles.pressed]}
    accessibilityRole="button"
  >
    <View>
      <Image
        source={{ uri: design.resultImageUrl }}
        style={variant === 'compact' ? styles.imageCompact : styles.imageGrid}
        contentFit="cover"
        transition={200}
      />
      {onToggleFavorite ? (
        <Pressable
          style={styles.heart}
          hitSlop={8}
          onPress={(): void => onToggleFavorite(design)}
          accessibilityLabel={design.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
        >
          <Ionicons
            name={design.isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={design.isFavorite ? COLORS.danger : COLORS.textPrimary}
          />
        </Pressable>
      ) : null}
    </View>
    <View style={styles.info}>
      <Text style={styles.title} numberOfLines={1}>
        {getStyleLabel(design.style)} · {getRoomTypeLabel(design.roomType)}
      </Text>
      <View style={styles.row}>
        <Text style={styles.date}>{formatDate(design.createdAt)}</Text>
        {onDelete ? (
          <Pressable hitSlop={8} onPress={(): void => onDelete(design)} accessibilityLabel="Xoá thiết kế">
            <Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, overflow: 'hidden' },
  grid: { flex: 1 },
  compact: { width: 160, marginRight: 12 },
  pressed: { opacity: 0.85 },
  imageGrid: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.surfaceAlt },
  imageCompact: { width: '100%', height: 110, backgroundColor: COLORS.surfaceAlt },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: 10 },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  date: { fontSize: 11, color: COLORS.textSecondary },
});

export default DesignCard;
