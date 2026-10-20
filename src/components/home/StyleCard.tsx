/**
 * src/components/home/StyleCard.tsx
 * The phong cach (anh vuong + ten). Dung o Home va AI Decor.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS } from '@/constants/colors';
import type { DesignStyleOption } from '@/types';

interface StyleCardProps {
  item: DesignStyleOption;
  selected?: boolean;
  onPress: (item: DesignStyleOption) => void;
  size?: number;
}

const StyleCard: React.FC<StyleCardProps> = ({ item, selected = false, onPress, size = 104 }) => (
  <Pressable
    onPress={(): void => onPress(item)}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    style={({ pressed }) => [styles.card, { width: size }, pressed && styles.pressed]}
  >
    <View style={[styles.imageWrap, { width: size, height: size }, selected && styles.selected]}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" transition={200} />
      {selected ? (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={14} color={COLORS.textPrimary} />
        </View>
      ) : null}
    </View>
    <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
      {item.label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: { marginRight: 12 },
  pressed: { opacity: 0.8 },
  imageWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: COLORS.surfaceAlt,
  },
  selected: { borderColor: COLORS.accent },
  image: { width: '100%', height: '100%' },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginTop: 6, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },
  labelSelected: { color: COLORS.textPrimary },
});

export default StyleCard;
