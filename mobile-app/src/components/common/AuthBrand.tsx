/**
 * src/components/common/AuthBrand.tsx
 * Dau trang Dang nhap / Dang ky: logo + ten app + 3 diem noi bat (de nguoi moi biet app lam duoc gi).
 * compact = ban gon cho man Dang ky (nhieu o nhap, can cho).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONT, RADIUS, SPACING } from '@/constants/colors';
import type { IoniconName } from '@/types';

const HIGHLIGHTS: { icon: IoniconName; label: string }[] = [
  { icon: 'scan-outline', label: 'Quét phòng' },
  { icon: 'cube-outline', label: 'Xem 3D' },
  { icon: 'receipt-outline', label: 'Báo giá' },
];

const AuthBrand: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <View style={[styles.wrap, compact && styles.wrapCompact]}>
    <View style={[styles.logo, compact && styles.logoCompact]}>
      <Ionicons name="home" size={compact ? 24 : 32} color={COLORS.onAccent} />
    </View>
    <Text style={[styles.name, compact && styles.nameCompact]} accessibilityRole="header">
      RoomDecor
    </Text>
    {compact ? null : (
      <>
        <Text style={styles.tagline}>Bày nội thất cho căn phòng của bạn trước khi mua</Text>
        <View style={styles.row}>
          {HIGHLIGHTS.map((h) => (
            <View key={h.label} style={styles.pill}>
              <Ionicons name={h.icon} size={14} color={COLORS.accent} />
              <Text style={styles.pillText}>{h.label}</Text>
            </View>
          ))}
        </View>
      </>
    )}
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: SPACING.xl },
  wrapCompact: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCompact: { width: 40, height: 40, borderRadius: 12 },
  name: { fontSize: 26, fontFamily: FONT.bold, color: COLORS.textPrimary, marginTop: 12 },
  nameCompact: { fontSize: 22, marginTop: 0 },
  tagline: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentSoft,
  },
  pillText: { fontSize: 12, fontFamily: FONT.medium, color: COLORS.textPrimary },
});

export default AuthBrand;
