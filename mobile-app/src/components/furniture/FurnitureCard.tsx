/**
 * src/components/furniture/FurnitureCard.tsx
 * The 1 mon noi that (thay ProductCard cu).
 * variant 'horizontal' -> cuon ngang (Home); 'grid' -> luoi 2 cot (Danh muc, bang chon do)
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADIUS, TYPE } from '@/constants/colors';
import { formatDimensions, getCategoryLabel } from '@/constants/furniture';
import type { Furniture } from '@/types';
import { formatPrice } from '@/utils';

import FurnitureThumb from './FurnitureThumb';

interface FurnitureCardProps {
  furniture: Furniture;
  variant?: 'horizontal' | 'grid';
  onPress: (furniture: Furniture) => void;
}

const FurnitureCard: React.FC<FurnitureCardProps> = ({ furniture, variant = 'grid', onPress }) => (
  <Pressable
    style={({ pressed }) => [styles.card, variant === 'horizontal' ? styles.horizontal : styles.grid, pressed && styles.pressed]}
    onPress={(): void => onPress(furniture)}
    accessibilityRole="button"
    accessibilityLabel={furniture.name}
  >
    <FurnitureThumb furniture={furniture} style={styles.image} />
    <View style={styles.info}>
      <Text style={styles.category} numberOfLines={1}>
        {getCategoryLabel(furniture.category)}
      </Text>
      <Text style={styles.title} numberOfLines={2}>
        {furniture.name}
      </Text>
      <Text style={styles.size} numberOfLines={1}>
        {formatDimensions(furniture)}
      </Text>
      <Text style={styles.price} numberOfLines={1}>
        {formatPrice(furniture.price, furniture.currency ?? 'VND')}
      </Text>
      {furniture.vendorName ? (
        <Text style={styles.vendor} numberOfLines={1}>
          {furniture.vendorName}
        </Text>
      ) : null}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, overflow: 'hidden' },
  horizontal: { width: 150, marginRight: 12 },
  grid: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  image: { width: '100%', aspectRatio: 1 },
  info: { padding: 8 },
  category: { ...TYPE.caption, color: COLORS.textSecondary },
  title: { ...TYPE.label, color: COLORS.textPrimary, marginTop: 2, minHeight: 34 },
  size: { ...TYPE.caption, color: COLORS.textSecondary, marginTop: 3 },
  price: { ...TYPE.label, fontWeight: '700', color: COLORS.accent, marginTop: 4, fontVariant: ['tabular-nums'] },
  vendor: { ...TYPE.caption, color: COLORS.inactive, marginTop: 1 },
});

export default FurnitureCard;
