/**
 * app/(main)/settings.tsx
 * Cai dat.
 *  - Moi nguoi dung: phien ban app, du lieu luu o dau (noi bang loi thuong), nut "Kiem tra ket noi"
 *    (bao ket qua bang loi thuong, khong hien dia chi may chu).
 *  - CHI quan tri vien (role ADMIN) hoac ban dang phat trien (__DEV__): khoi "Ky thuat"
 *    (che do du lieu, dia chi API, cach doi trong .env).
 *    Nguoi dung thuong khong can va khong nen phai biet dia chi may chu / IP.
 */
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import Button from '@/components/common/Button';
import { API_BASE_URL, API_URL_FROM_ENV, USE_MOCK } from '@/constants';
import { COLORS, FONT, RADIUS, SPACING } from '@/constants/colors';
import { healthApi, type HealthResult } from '@/services/health-api';
import { useAuthStore } from '@/store/auth-store';
import type { IoniconName } from '@/types';
import { haptic } from '@/utils/haptics';

type CheckState = { kind: 'idle' } | { kind: 'checking' } | ({ kind: 'done' } & HealthResult);

const Row: React.FC<{ icon?: IoniconName; label: string; value: string; last?: boolean; selectable?: boolean }> = ({
  icon,
  label,
  value,
  last,
  selectable,
}) => (
  <View style={[styles.row, last && styles.rowLast]}>
    {icon ? (
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={COLORS.accent} />
      </View>
    ) : null}
    <View style={styles.flex}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable={selectable}>
        {value}
      </Text>
    </View>
  </View>
);

export default function SettingsScreen() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const showTechnical = isAdmin || __DEV__;
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' });
  const checkingRef = useRef(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handleCheck = async (): Promise<void> => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setCheck({ kind: 'checking' });
    const result = await healthApi.check();
    if (result.ok) haptic.success();
    else haptic.warning();
    setCheck({ kind: 'done', ...result });
    checkingRef.current = false;
  };

  // Nguoi dung thuong: bao bang loi thuong; quan tri vien: giu thong bao chi tiet (co dia chi, ma loi)
  const resultText = (r: HealthResult): string => {
    if (showTechnical) return r.message;
    return r.ok
      ? 'Kết nối tốt. Thiết kế của bạn được lưu và đồng bộ bình thường.'
      : 'Chưa kết nối được. Kiểm tra Wi-Fi hoặc 4G rồi thử lại sau ít phút.';
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Ứng dụng</Text>
      <View style={styles.card}>
        <Row icon="information-circle-outline" label="Phiên bản" value={`RoomDecor ${version}`} last />
      </View>

      <Text style={styles.section}>Dữ liệu của bạn</Text>
      <View style={styles.card}>
        <Row
          icon="cloud-done-outline"
          label="Thiết kế và nội thất"
          value="Lưu lên tài khoản mỗi khi bấm Lưu, mở trên máy khác vẫn thấy."
        />
        <Row icon="image-outline" label="Ảnh phòng" value="Gửi lên tài khoản để AI dựng mặt bằng." />
        <Row
          icon="phone-portrait-outline"
          label="Ảnh 3D thu nhỏ"
          value="Chỉ lưu trên điện thoại này, dùng cho màn Của tôi."
          last
        />
      </View>

      <Button
        title="Kiểm tra kết nối"
        iconName="pulse-outline"
        variant="secondary"
        onPress={(): void => void handleCheck()}
        loading={check.kind === 'checking'}
        style={styles.button}
        noHaptic
      />

      {check.kind === 'done' ? (
        <View style={[styles.result, check.ok ? styles.resultOk : styles.resultFail]} accessibilityLiveRegion="polite">
          <Ionicons
            name={check.ok ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={check.ok ? COLORS.success : COLORS.dangerText}
          />
          <Text style={styles.resultText}>{resultText(check)}</Text>
        </View>
      ) : null}

      {showTechnical ? (
        <>
          <View style={styles.techHeader}>
            <Text style={[styles.section, styles.techTitle]}>Kỹ thuật</Text>
            <View style={styles.techBadge}>
              <Text style={styles.techBadgeText}>{isAdmin ? 'Chỉ quản trị viên thấy' : 'Bản phát triển'}</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Row label="Chế độ dữ liệu" value={USE_MOCK ? 'Minh họa (mock, không gọi máy chủ)' : 'Gọi API Spring Boot thật'} />
            <Row label="Địa chỉ API" value={API_BASE_URL} selectable />
            <Row label="Nguồn địa chỉ" value={API_URL_FROM_ENV ? 'File .env' : 'Mặc định theo nền tảng'} last />
          </View>
          <Text style={styles.hint}>
            Đổi bằng file mobile-app/.env (EXPO_PUBLIC_USE_MOCK, EXPO_PUBLIC_API_URL) rồi chạy lại `npx expo start -c`.
            Bản APK đã cài thì địa chỉ cố định lúc build (eas.json).
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  section: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  card: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  rowLabel: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary },
  rowValue: { fontSize: 15, fontFamily: FONT.regular, color: COLORS.textPrimary, marginTop: 2 },
  hint: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, lineHeight: 18, marginTop: SPACING.sm },
  button: { marginTop: SPACING.lg },
  result: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md, padding: 12, borderRadius: RADIUS.sm },
  resultOk: { backgroundColor: 'rgba(46,204,113,0.12)' },
  resultFail: { backgroundColor: COLORS.dangerSoft },
  resultText: { flex: 1, color: COLORS.textPrimary, fontSize: 13, fontFamily: FONT.regular },
  techHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  techTitle: { marginTop: 0, marginBottom: 0 },
  techBadge: { paddingHorizontal: 8, height: 22, justifyContent: 'center', borderRadius: RADIUS.pill, backgroundColor: COLORS.warningSoft },
  techBadgeText: { fontSize: 12, fontFamily: FONT.medium, color: COLORS.warningText },
});
