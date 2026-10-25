/**
 * src/components/common/Chip.tsx
 * Vien bo tron co the chon (dung cho danh muc noi that...).
 */
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import type { IoniconName } from '@/types';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  iconName?: IoniconName;
}

const Chip: React.FC<ChipProps> = ({ label, selected = false, onPress, iconName }) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
  >
    {iconName ? (
      <Ionicons name={iconName} size={16} color={selected ? COLORS.accent : COLORS.textSecondary} />
    ) : null}
    <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  selected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  pressed: { opacity: 0.7 },
  label: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  labelSelected: { color: COLORS.textPrimary },
});

export default Chip;
