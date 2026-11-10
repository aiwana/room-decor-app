/**
 * src/components/design/CornerPhotosPicker.tsx
 * Chup them anh cac goc phong (khong bat buoc) de AI ghep lai, doan hinh dang phong chinh xac hon.
 * Moi o co 1 cau goi y vi tri dung chup (trung so 2..5 trong bang ScanGuideSheet, anh chinh = vi tri 1);
 * anh da chup hien thu nho + nut xoa, anh chup doc co nhan canh bao (AI thay it tuong hon).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONT, RADIUS, SPACING, TOUCH_MIN } from '@/constants/colors';
import type { PickedImage } from '@/hooks/useRoomImagePicker';

/** Goi y cho tung anh, theo thu tu chup = vi tri 2..5 tren so do "Cách chụp cho chính xác" */
const CORNER_HINTS = [
  'Sang góc đối diện với chỗ chụp ảnh chính (vị trí 2), chụp chéo ngược lại',
  'Đứng ở 1 góc còn lại (vị trí 3), chụp chéo sang góc đối diện',
  'Đứng ở góc cuối cùng (vị trí 4), chụp chéo sang góc đối diện',
  'Chụp chỗ tường gấp khúc, hốc tường (vị trí 5, nếu có)',
] as const;

/** Anh chup doc (cao > rong): AI thay it tuong hon anh ngang */
export const isPortrait = (img: PickedImage): boolean => img.width > 0 && img.height > img.width;

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
  const portraitNumbers = images.map((img, i) => (isPortrait(img) ? i + 1 : 0)).filter((n) => n > 0);

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
              {isPortrait(img) ? (
                <View style={styles.portraitBadge} accessibilityLabel="Ảnh chụp dọc">
                  <Ionicons name="phone-portrait-outline" size={12} color={COLORS.warningText} />
                </View>
              ) : null}
              <Text style={styles.thumbLabel}>Góc {i + 1}</Text>
              {!disabled ? (
                <Pressable
                  style={styles.removeBtn}
                  onPress={(): void => onRemove(i)}
                  accessibilityLabel={`Xoá ảnh góc ${i + 1}`}
                  hitSlop={11}
                >
                  <Ionicons name="close" size={14} color={COLORS.textPrimary} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {portraitNumbers.length > 0 ? (
        <View style={styles.warnBox}>
          <Ionicons name="warning-outline" size={16} color={COLORS.warningText} />
          <Text style={styles.warnText}>
            Ảnh góc {portraitNumbers.join(', ')} chụp dọc nên AI thấy ít tường hơn. Nên xoá và chụp lại theo chiều ngang.
          </Text>
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
              <Ionicons name="camera-outline" size={16} color={COLORS.onAccent} />
              <Text style={[styles.addBtnText, styles.addBtnTextOnAccent]}>Chụp</Text>
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
  title: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.textPrimary },
  counter: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary },
  subtitle: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.sm },
  thumbWrap: { width: 76 },
  thumb: { width: 76, height: 76, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt },
  thumbLabel: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
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
  portraitBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.overlay,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SPACING.sm,
    padding: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.warningSoft,
  },
  warnText: { flex: 1, fontSize: 12, fontFamily: FONT.regular, color: COLORS.warningText },
  addBox: { marginTop: SPACING.sm },
  hint: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.textSecondary },
  hintStrong: { fontFamily: FONT.bold, color: COLORS.accent },
  row: { flexDirection: 'row', gap: 10, marginTop: SPACING.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: TOUCH_MIN,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.greenFrom,
  },
  addBtnAlt: { backgroundColor: COLORS.slateFrom },
  addBtnTextOnAccent: { color: COLORS.onAccent },
  addBtnText: { color: COLORS.textPrimary, fontFamily: FONT.bold, fontSize: 13 },
});

export default CornerPhotosPicker;
