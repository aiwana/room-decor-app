/**
 * src/components/design/CornerPhotosPicker.tsx
 * Chup them anh cac goc phong (khong bat buoc) de AI ghep lai, doan hinh dang phong chinh xac hon.
 * Moi o co 1 cau goi y vi tri dung chup; anh da chup hien thu nho + nut xoa.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import type { PickedImage } from '@/hooks/useRoomImagePicker';

/** Goi y cho tung anh, theo thu tu chup */
const CORNER_HINTS = [
  'Đứng ở cửa, chụp góc đối diện',
  'Đứng ở góc đối diện, chụp về phía cửa',
  'Chụp góc bên trái phòng',
  'Chụp góc bên phải phòng',
  'Chụp chỗ tường bị gấp khúc / lồi lõm (nếu có)',
] as const;

interface CornerPhotosPickerProps {
  images: PickedImage[];
  max: number;
  disabled?: boolean;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onRemove: (index: number) => void;
}

const CornerPhotosPicker: React.FC<CornerPhotosPickerProps> = ({
  images,
  max,
  disabled = false,
  onPickCamera,
  onPickGallery,
  onRemove,
}) => {
  const canAdd = images.length < max && !disabled;
  const nextHint = CORNER_HINTS[images.length] ?? 'Chụp thêm 1 góc phòng';

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Chụp thêm góc phòng</Text>
        <Text style={styles.counter}>
          {images.length}/{max} · không bắt buộc
        </Text>
      </View>
      <Text style={styles.subtitle}>
        AI nhìn được nhiều góc sẽ đoán hình dạng phòng chính xác hơn, nhất là phòng không vuông.
      </Text>

      {images.length > 0 ? (
        <View style={styles.grid}>
          {images.map((img, i) => (
            <View key={`${i}-${img.uri}`} style={styles.thumbWrap}>
              <Image source={{ uri: img.uri }} style={styles.thumb} contentFit="cover" />
              <Text style={styles.thumbLabel}>Góc {i + 1}</Text>
              {!disabled ? (
                <Pressable
                  style={styles.removeBtn}
                  onPress={(): void => onRemove(i)}
                  accessibilityLabel={`Xoá ảnh góc ${i + 1}`}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color={COLORS.textPrimary} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {canAdd ? (
        <View style={styles.addBox}>
          <Text style={styles.hint}>
            <Text style={styles.hintStrong}>Góc {images.length + 1}: </Text>
            {nextHint}
          </Text>
          <View style={styles.row}>
            <Pressable style={styles.addBtn} onPress={onPickCamera} accessibilityRole="button">
              <Ionicons name="camera-outline" size={16} color={COLORS.textPrimary} />
              <Text style={styles.addBtnText}>Chụp</Text>
            </Pressable>
            <Pressable style={[styles.addBtn, styles.addBtnAlt]} onPress={onPickGallery} accessibilityRole="button">
              <Ionicons name="images-outline" size={16} color={COLORS.textPrimary} />
              <Text style={styles.addBtnText}>Thư viện</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  counter: { fontSize: 12, color: COLORS.textSecondary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.sm },
  thumbWrap: { width: 76 },
  thumb: { width: 76, height: 76, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt },
  thumbLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.overlay,
  },
  addBox: { marginTop: SPACING.sm },
  hint: { fontSize: 13, color: COLORS.textSecondary },
  hintStrong: { fontWeight: '700', color: COLORS.accent },
  row: { flexDirection: 'row', gap: 10, marginTop: SPACING.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.greenFrom,
  },
  addBtnAlt: { backgroundColor: COLORS.slateFrom },
  addBtnText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 13 },
});

export default CornerPhotosPicker;
