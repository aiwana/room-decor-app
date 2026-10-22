/**
 * src/components/home/InspirationCard.tsx
 * The ngang anh cam hung tren Home (giu layout ban cu).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { COLORS, RADIUS } from '@/constants/colors';
import type { Inspiration } from '@/types';

interface InspirationCardProps {
  item: Inspiration;
  onPress: (item: Inspiration) => void;
}

const InspirationCard: React.FC<InspirationCardProps> = ({ item, onPress }) => (
  <Pressable
    onPress={(): void => onPress(item)}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    accessibilityRole="button"
  >
    <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" transition={200} />
    <View style={styles.info}>
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {item.subtitle}
      </Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    width: 220,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    marginRight: 12,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  image: { width: '100%', height: 130, backgroundColor: COLORS.surfaceAlt },
  info: { padding: 10 },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
});

export default InspirationCard;
