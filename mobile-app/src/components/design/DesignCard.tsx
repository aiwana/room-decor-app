/**
 * src/components/design/DesignCard.tsx
 * The 1 thiet ke (anh phong + ten + so mon do + ngay).
 * variant 'grid'    -> man "Thiet ke cua toi" (2 cot, co nut xoa)
 * variant 'compact' -> Home "Thiet ke gan day" (cuon ngang)
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS, TYPE } from '@/constants/colors';
import type { DesignDetail } from '@/types';
import { formatDate } from '@/utils';

interface DesignCardProps {
  design: DesignDetail;
  variant?: 'grid' | 'compact';
  onPress: (design: DesignDetail) => void;
  onDelete?: (design: DesignDetail) => void;
}

const DesignCard: React.FC<DesignCardProps> = ({ design, variant = 'grid', onPress, onDelete }) => {
  const imageStyle = variant === 'compact' ? styles.imageCompact : styles.imageGrid;
  return (
    <Pressable
      onPress={(): void => onPress(design)}
      style={({ pressed }) => [styles.card, variant === 'compact' ? styles.compact : styles.grid, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={design.name}
    >
      {design.roomImageUri ? (
        <Image source={{ uri: design.roomImageUri }} style={imageStyle} contentFit="cover" transition={200} />
      ) : (
        // Thiet ke tao tren may khac -> may nay khong co anh phong
        <View style={[imageStyle, styles.noImage]}>
          <Ionicons name="image-outline" size={28} color={COLORS.inactive} />
        </View>
      )}
      <View style={styles.badge}>
        <Ionicons name="cube-outline" size={12} color={COLORS.textPrimary} />
        <Text style={styles.badgeText}>{design.placements.length}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {design.name}
        </Text>
        <View style={styles.row}>
          <Text style={styles.date}>{formatDate(design.updatedAt)}</Text>
          {onDelete ? (
            <Pressable
              style={styles.deleteBtn}
              hitSlop={4}
              onPress={(): void => onDelete(design)}
              accessibilityRole="button"
              accessibilityLabel={`Xoá thiết kế ${design.name}`}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, overflow: 'hidden' },
  grid: { flex: 1 },
  compact: { width: 160, marginRight: 12 },
  pressed: { opacity: 0.85 },
  imageGrid: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.surfaceAlt },
  imageCompact: { width: '100%', height: 110, backgroundColor: COLORS.surfaceAlt },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 24,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.overlay,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
  info: { padding: 10 },
  // Vung bam 36 + hitSlop 4 moi phia = 44 (truoc day ~32, de bam nham mo thiet ke)
  deleteBtn: { width: 36, height: 36, marginRight: -10, marginVertical: -10, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.label, color: COLORS.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  date: { ...TYPE.caption, color: COLORS.textSecondary },
});

export default DesignCard;
