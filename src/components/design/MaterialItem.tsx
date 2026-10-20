/**
 * src/components/design/MaterialItem.tsx
 * 1 dong "vat lieu duoc su dung" tren man Result.
 * Bam vao -> Product Detail (module Catalog).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import type { Product } from '@/types';
import { formatVnd } from '@/utils/format';

interface MaterialItemProps {
  product: Product;
  usage: string;
  onPress: (product: Product) => void;
}

const MaterialItem: React.FC<MaterialItemProps> = ({ product, usage, onPress }) => (
  <Pressable
    onPress={(): void => onPress(product)}
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    accessibilityRole="button"
  >
    <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" />
    <View style={styles.info}>
      <Text style={styles.usage}>{usage}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={styles.price}>
        {formatVnd(product.price)} / {product.unit}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.inactive} />
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  pressed: { opacity: 0.8 },
  image: { width: 56, height: 56, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt },
  info: { flex: 1 },
  usage: { fontSize: 11, color: COLORS.accent, fontWeight: '700', textTransform: 'uppercase' },
  name: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600', marginTop: 2 },
  price: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});

export default MaterialItem;
