/**
 * src/components/ProductCard.tsx
 * Component con tai su dung: the san pham VLXD dang doc (Trending) hoac
 * the du an nam ngang (Reference Projects) - dieu khinh bang prop `variant`.
 */
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Product, Project } from '../types';

/** Gia dinh format tien te VND: 285000 -> "285.000đ" */
const formatVnd = (value: number): string =>
  `${value.toLocaleString('vi-VN')}đ`;

interface ProductCardProps {
  /** Du lieu: Product (variant 'trending') hoac Project (variant 'project') */
  data: Product | Project;
  variant?: 'trending' | 'project';
  onPress?: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  data,
  variant = 'trending',
  onPress,
}) => {
  const isProject = variant === 'project';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isProject ? styles.cardProject : styles.cardTrending,
        pressed && styles.pressed,
      ]}
      onPress={(): void => {
        if (onPress) {
          onPress(data.id);
        }
      }}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: data.imageUrl }}
        style={[styles.image, isProject ? styles.imageProject : styles.imageTrending]}
        resizeMode="cover"
      />
      {isProject ? (
        <View style={styles.infoProject}>
          <Text style={styles.title} numberOfLines={1}>
            {(data as Project).name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {'📍 '}
            {(data as Project).location}
            {' · '}
            {(data as Project).area}
          </Text>
        </View>
      ) : (
        <View style={styles.infoTrending}>
          <Text style={styles.title} numberOfLines={2}>
            {(data as Product).name}
          </Text>
          <Text style={styles.price} numberOfLines={1}>
            {formatVnd((data as Product).price)} / {(data as Product).unit}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: '#262626',
    overflow: 'hidden',
    marginRight: 12,
  },
  cardTrending: {
    width: 140,
    height: 180,
  },
  cardProject: {
    width: 200,
    height: 150,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: '100%',
    backgroundColor: '#333333',
  },
  imageTrending: {
    height: 120,
    aspectRatio: 0.8,
  },
  imageProject: {
    height: 92,
  },
  infoTrending: {
    padding: 8,
  },
  infoProject: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#B0B0B0',
    marginTop: 4,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E67E22',
    marginTop: 4,
  },
});

export default ProductCard;
