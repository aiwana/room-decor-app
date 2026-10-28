/**
 * src/components/editor/RoomMaterialPicker.tsx
 * Overlay chon vat lieu san/tuong/len chan tuong tu catalog (GET /api/materials).
 * Hien texture that, mau du phong va gia tham khao.
 */
import React, { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import Button from '@/components/common/Button';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import {
  FALLBACK_MATERIALS,
  SKIRTING_MATERIALS,
  type RoomMaterial,
} from '@/constants/materials';
import type { Material, MaterialKind } from '@/types';
import { formatShortPrice, toAssetUrl } from '@/utils';

interface RoomMaterialPickerProps {
  visible: boolean;
  onClose: () => void;
  materials: Material[];
  floorMaterial: string;
  wallMaterial: string;
  skirtingMaterial: string;
  onChangeFloor: (code: string) => void;
  onChangeWall: (code: string) => void;
  onChangeSkirting: (code: string) => void;
}

const fallbackToMaterial = (m: RoomMaterial, kind: MaterialKind): Material => ({
  id: m.id,
  code: m.id,
  name: m.label,
  kind,
  colorHex: m.color,
  price: null,
  priceUnit: kind === 'skirting' ? 'md' : 'm2',
  isSample: true,
});

const MaterialRow: React.FC<{
  label: string;
  kind: MaterialKind;
  materials: Material[];
  selectedCode: string;
  onSelect: (code: string) => void;
}> = ({ label, kind, materials, selectedCode, onSelect }) => {
  const filtered = materials.filter((m) => m.kind === kind);
  const items =
    filtered.length > 0
      ? filtered
      : kind === 'skirting'
        ? SKIRTING_MATERIALS.map((m) => fallbackToMaterial(m, kind))
        : FALLBACK_MATERIALS.filter((m) => m.kind === kind);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
        {[...items]
          .sort((a, b) => Number(b.code === selectedCode) - Number(a.code === selectedCode))
          .map((item) => {
          const selected = item.code === selectedCode;
          const uri = toAssetUrl(item.textureUrl);
          return (
            <Pressable
              key={item.code}
              onPress={(): void => onSelect(item.code)}
              style={[styles.option, selected && styles.optionSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${item.name}`}
            >
              <View style={[styles.thumb, { backgroundColor: item.colorHex ?? COLORS.surfaceAlt }, selected && styles.thumbSelected]}>
                {uri ? <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" /> : null}
              </View>
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.price} numberOfLines={1}>
                {formatShortPrice(item.price, item.priceUnit)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const RoomMaterialPicker: React.FC<RoomMaterialPickerProps> = ({
  visible,
  onClose,
  materials,
  floorMaterial,
  wallMaterial,
  skirtingMaterial,
  onChangeFloor,
  onChangeWall,
  onChangeSkirting,
}) => {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vật liệu phòng</Text>
          <Text style={styles.hint}>Giá tham khảo, chưa gồm thi công.</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng">
          <Ionicons name="close" size={26} color={COLORS.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <MaterialRow label="Sàn" kind="floor" materials={materials} selectedCode={floorMaterial} onSelect={onChangeFloor} />
        <MaterialRow label="Tường" kind="wall" materials={materials} selectedCode={wallMaterial} onSelect={onChangeWall} />
        <MaterialRow
          label="Len chân tường"
          kind="skirting"
          materials={materials}
          selectedCode={skirtingMaterial}
          onSelect={onChangeSkirting}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Xong" onPress={onClose} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    zIndex: 30,
    elevation: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 19, fontWeight: '700', color: COLORS.textPrimary },
  hint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  content: { padding: SPACING.md, gap: SPACING.lg, paddingBottom: SPACING.xl },
  row: { gap: 8 },
  rowLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  options: { gap: SPACING.sm, paddingRight: SPACING.sm },
  option: {
    width: 88,
    padding: 6,
    gap: 3,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  thumbSelected: { borderWidth: 2, borderColor: COLORS.accent },
  thumbImage: { width: '100%', height: '100%' },
  optionLabel: { fontSize: 10, color: COLORS.textSecondary, minHeight: 26 },
  optionLabelSelected: { color: COLORS.textPrimary, fontWeight: '700' },
  price: { fontSize: 11, color: COLORS.accent, fontWeight: '700' },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default RoomMaterialPicker;
