/**
 * app/(main)/settings.tsx
 * Cai dat: xem che do du lieu (mock / API that), dia chi API dang dung,
 * nut "Kiem tra ket noi" de phat hien som sai IP / sai cong / backend chua chay.
 */
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Button from '@/components/common/Button';
import { API_BASE_URL, API_URL_FROM_ENV, USE_MOCK } from '@/constants';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { healthApi, type HealthResult } from '@/services/health-api';

type CheckState = { kind: 'idle' } | { kind: 'checking' } | ({ kind: 'done' } & HealthResult);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} selectable>
      {value}
    </Text>
  </View>
);

export default function SettingsScreen() {
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' });
  const checkingRef = useRef(false);

  const handleCheck = async (): Promise<void> => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setCheck({ kind: 'checking' });
    const result = await healthApi.check();
    setCheck({ kind: 'done', ...result });
    checkingRef.current = false;
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Kết nối máy chủ</Text>
      <View style={styles.card}>
        <Row label="Chế độ dữ liệu" value={USE_MOCK ? 'Minh họa (mock, không gọi máy chủ)' : 'Gọi API Spring Boot thật'} />
        <Row label="Địa chỉ API" value={API_BASE_URL} />
        <Row label="Nguồn địa chỉ" value={API_URL_FROM_ENV ? 'File .env' : 'Mặc định theo nền tảng'} />
      </View>
      <Text style={styles.hint}>
        Đổi bằng file mobile-app/.env (EXPO_PUBLIC_USE_MOCK, EXPO_PUBLIC_API_URL) rồi chạy lại `npx expo start -c`.
        Điện thoại thật phải dùng IP LAN của máy tính, không dùng localhost hay 10.0.2.2.
      </Text>

      <Text style={styles.section}>Lưu trữ</Text>
      <View style={styles.card}>
        <Row label="Vị trí nội thất" value="Lưu trên máy này (máy chủ chưa có API lưu)" />
        <Row label="Ảnh phòng" value="Tải lên máy chủ, hiển thị bằng bản trên máy" />
      </View>

      <Button
        title="Kiểm tra kết nối"
        iconName="pulse-outline"
        variant="secondary"
        onPress={(): void => void handleCheck()}
        loading={check.kind === 'checking'}
        style={styles.button}
      />

      {check.kind === 'done' ? (
        <View style={[styles.result, check.ok ? styles.resultOk : styles.resultFail]}>
          <Ionicons
            name={check.ok ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={check.ok ? COLORS.success : COLORS.danger}
          />
          <Text style={styles.resultText}>{check.message}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  section: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.md },
  card: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 12, color: COLORS.textSecondary },
  rowValue: { fontSize: 15, color: COLORS.textPrimary, marginTop: 2 },
  hint: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginTop: SPACING.sm },
  button: { marginTop: SPACING.lg },
  result: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md, padding: 12, borderRadius: RADIUS.sm },
  resultOk: { backgroundColor: 'rgba(46,204,113,0.12)' },
  resultFail: { backgroundColor: 'rgba(231,76,60,0.12)' },
  resultText: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
});
