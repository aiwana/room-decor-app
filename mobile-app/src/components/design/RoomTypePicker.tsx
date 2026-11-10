/**
 * src/components/design/RoomTypePicker.tsx
 * Chon loai phong (chip, xuong dong): dung khi tao thiet ke va trong bang thao tac o "Của tôi".
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONT, RADIUS } from '@/constants/colors';
import { ROOM_TYPES, type RoomType } from '@/constants/room-types';
import { haptic } from '@/utils/haptics';

interface RoomTypePickerProps {
  value: RoomType;
  onChange: (value: RoomType) => void;
  disabled?: boolean;
  label?: string;
}

const RoomTypePicker: React.FC<RoomTypePickerProps> = ({ value, onChange, disabled = false, label = 'Loại phòng' }) => (
  <View style={styles.wrap}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {ROOM_TYPES.map((t) => {
        const active = t.id === value;
        return (
          <Pressable
            key={t.id}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
            onPress={(): void => {
              haptic.select();
              onChange(t.id);
            }}
            disabled={disabled}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            accessibilityLabel={t.label}
          >
            <Ionicons name={t.icon} size={15} color={active ? COLORS.accent : COLORS.textSecondary} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONT.semibold, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  pressed: { opacity: 0.75 },
  chipText: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.textPrimary },
});

export default RoomTypePicker;
