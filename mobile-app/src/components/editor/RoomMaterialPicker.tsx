/**
 * src/components/editor/RoomMaterialPicker.tsx
 * Chon mau/gach cho san va tuong. Chi hien thi mau, chua co texture that.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import {
  FLOOR_MATERIALS,
  WALL_MATERIALS,
  type RoomMaterial,
} from '@/constants/materials';

interface RoomMaterialPickerProps {
  floorMaterial: string;
  wallMaterial: string;
  onChangeFloor: (id: string) => void;
  onChangeWall: (id: string) => void;
}

const MaterialRow: React.FC<{
  label: string;
  items: RoomMaterial[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ label, items, selectedId, onSelect }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={styles.options}>
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={(): void => onSelect(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label}: ${item.label}`}
            style={styles.option}
          >
            <View style={[styles.swatch, { backgroundColor: item.color }, selected && styles.swatchSelected]} />
            <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const RoomMaterialPicker: React.FC<RoomMaterialPickerProps> = ({
  floorMaterial,
  wallMaterial,
  onChangeFloor,
  onChangeWall,
}) => (
  <View style={styles.container}>
    <Text style={styles.heading}>Vật liệu phòng</Text>
    <MaterialRow label="Sàn" items={FLOOR_MATERIALS} selectedId={floorMaterial} onSelect={onChangeFloor} />
    <MaterialRow label="Tường" items={WALL_MATERIALS} selectedId={wallMaterial} onSelect={onChangeWall} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  heading: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  row: { gap: 6 },
  rowLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  option: { alignItems: 'center', width: 68, gap: 4 },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  swatchSelected: { borderColor: COLORS.accent, borderWidth: 3 },
  optionLabel: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center' },
  optionLabelSelected: { color: COLORS.textPrimary, fontWeight: '700' },
});

export default RoomMaterialPicker;
