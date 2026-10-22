/**
 * src/components/common/Notice.tsx
 * Dai thong bao nho mau cam (vd "dang dung du lieu mau").
 * MockModeNotice: chi hien khi USE_MOCK = true, de nguoi test khong nham la du lieu that.
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { USE_MOCK } from '@/constants';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';

interface NoticeProps {
  message: string;
  style?: StyleProp<ViewStyle>;
}

export const Notice: React.FC<NoticeProps> = ({ message, style }) => (
  <View style={[styles.box, style]} accessibilityRole="text">
    <Ionicons name="information-circle-outline" size={16} color={COLORS.accent} />
    <Text style={styles.text}>{message}</Text>
  </View>
);

export const MockModeNotice: React.FC<Partial<NoticeProps>> = ({
  message = 'Chế độ minh họa: dữ liệu chỉ lưu trên máy này, chưa gọi máy chủ.',
  style,
}) => (USE_MOCK ? <Notice message={message} style={style} /> : null);

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
