/**
 * src/components/decor/ImagePickerBox.tsx
 * Khung chon anh phong: chua co anh -> 2 nut Camera / Thu vien;
 * da co anh -> xem truoc + nut doi anh.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';

interface ImagePickerBoxProps {
  imageUri: string | null;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onClear: () => void;
}

const ImagePickerBox: React.FC<ImagePickerBoxProps> = ({ imageUri, onPickCamera, onPickGallery, onClear }) => {
  if (imageUri) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
        <View style={styles.previewActions}>
          <Pressable style={styles.smallBtn} onPress={onPickGallery} accessibilityLabel="Đổi ảnh">
            <Ionicons name="swap-horizontal" size={16} color={COLORS.textPrimary} />
            <Text style={styles.smallBtnText}>Đổi ảnh</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={onClear} accessibilityLabel="Xoá ảnh">
            <Ionicons name="trash-outline" size={16} color={COLORS.textPrimary} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <Ionicons name="image-outline" size={40} color={COLORS.inactive} />
      <Text style={styles.hint}>Chụp hoặc chọn 1 ảnh căn phòng của bạn</Text>
      <View style={styles.row}>
        <Pressable style={styles.bigBtn} onPress={onPickCamera} accessibilityRole="button">
          <Ionicons name="camera" size={20} color={COLORS.textPrimary} />
          <Text style={styles.bigBtnText}>Camera</Text>
        </Pressable>
        <Pressable style={[styles.bigBtn, styles.bigBtnAlt]} onPress={onPickGallery} accessibilityRole="button">
          <Ionicons name="images" size={20} color={COLORS.textPrimary} />
          <Text style={styles.bigBtnText}>Thư viện</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    padding: SPACING.lg,
    alignItems: 'center',
  },
  hint: { marginTop: SPACING.sm, color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, marginTop: SPACING.md },
  bigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.greenFrom,
  },
  bigBtnAlt: { backgroundColor: COLORS.slateFrom },
  bigBtnText: { color: COLORS.textPrimary, fontWeight: '700' },
  previewWrap: { marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden' },
  preview: { width: '100%', aspectRatio: 4 / 3, backgroundColor: COLORS.surfaceAlt },
  previewActions: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', gap: 8 },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.overlay,
  },
  smallBtnText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
});

export default ImagePickerBox;
