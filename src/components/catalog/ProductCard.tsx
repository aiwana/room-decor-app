/**
 * src/components/catalog/ProductCard.tsx
 * The san pham (module Catalog). Chuyen tu components/ProductCard.tsx cu:
 * - Chi con hien thi Product (phan Project da tach thanh InspirationCard)
 * - Them rating + danh muc (ten danh muc lay tu product.categoryName, khong doc mock)
 * variant 'horizontal' -> cuon ngang (Home); 'grid' -> luoi 2 cot (Catalog)
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS } from '@/constants/colors';
import type { Product } from '@/types';
import { formatVnd } from '@/utils/format';

interface ProductCardProps {
  product: Product;
  variant?: 'horizontal' | 'grid';
  onPress: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, variant = 'grid', onPress }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        variant === 'horizontal' ? styles.horizontal : styles.grid,
        pressed && styles.pressed,
      ]}
      onPress={(): void => onPress(product)}
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" transition={200} />
      <View style={styles.info}>
        <Text style={styles.category} numberOfLines={1}>
          {product.categoryName ?? ''}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#F1C40F" />
          <Text style={styles.rating}>
            {product.rating.toFixed(1)} ({product.reviewCount})
          </Text>
        </View>
        <Text style={styles.price} numberOfLines={1}>
          {formatVnd(product.price)} / {product.unit}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, overflow: 'hidden' },
  horizontal: { width: 150, marginRight: 12 },
  grid: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  image: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.surfaceAlt },
  info: { padding: 8 },
  category: { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase', fontWeight: '600' },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2, minHeight: 34 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { fontSize: 11, color: COLORS.textSecondary },
  price: { fontSize: 12, fontWeight: '700', color: COLORS.accent, marginTop: 4 },
});

export default ProductCard;
