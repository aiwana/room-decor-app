/**
 * src/components/home/QuickActionItem.tsx
 * 1 icon tron + label (Quick Actions tren Home).
 * Giu nguyen giao dien cu, chi doi `routeName` -> `href` cua Expo Router.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors';
import type { QuickAction } from '@/types';

interface QuickActionItemProps {
  action: QuickAction;
  onPress: (action: QuickAction) => void;
}

const CIRCLE_SIZE = 64;
const ICON_SIZE = 28;

const QuickActionItem: React.FC<QuickActionItemProps> = ({ action, onPress }) => (
  <Pressable
    style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
    onPress={(): void => onPress(action)}
    accessibilityRole="button"
    accessibilityLabel={action.label}
  >
    <View style={styles.circle}>
      <Ionicons name={action.iconName} size={ICON_SIZE} color={COLORS.textPrimary} />
    </View>
    <Text style={styles.label} numberOfLines={1}>
      {action.label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', width: 80 },
  pressed: { opacity: 0.6, transform: [{ scale: 0.95 }] },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginTop: 8, fontSize: 12, color: COLORS.textPrimary, textAlign: 'center' },
});

export default QuickActionItem;
