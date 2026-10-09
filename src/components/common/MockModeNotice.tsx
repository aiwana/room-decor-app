/**
 * src/components/common/MockModeNotice.tsx
 * Dai thong bao nho: dang o CHE DO MINH HOA (USE_MOCK = true).
 * Giup nguoi dung / nguoi test khong nham du lieu da duoc luu len may chu.
 * O che do API thi khong hien gi.
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { USE_MOCK } from '@/services/config';

interface MockModeNoticeProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

const MockModeNotice: React.FC<MockModeNoticeProps> = ({
  message = 'Chế độ minh họa: dữ liệu chỉ lưu trên máy này, chưa đồng bộ máy chủ.',
  style,
}) => {
  if (!USE_MOCK) return null;
  return (
    <View style={[styles.box, style]} accessibilityRole="text">
      <Ionicons name="information-circle-outline" size={16} color={COLORS.accent} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentSoft,
  },
  text: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
});

export default MockModeNotice;
