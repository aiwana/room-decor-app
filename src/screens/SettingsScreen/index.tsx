/**
 * src/screens/SettingsScreen/index.tsx
 * Cai dat (ban dau): xem che do du lieu, dia chi API dang dung,
 * va nut "Kiem tra ket noi" goi GET /health (endpoint DA CO tren backend).
 * Giup phat hien som sai IP / sai cong / backend chua chay.
 */
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Button from '@/components/common/Button';
import { COLORS, RADIUS, SPACING } from '@/constants/colors';
import { getErrorMessage } from '@/services/apiError';
import { API_URL, API_URL_FROM_ENV, USE_MOCK } from '@/services/config';
import { healthService } from '@/services/healthService';

type CheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; message: string }
  | { kind: 'fail'; message: string };

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} selectable>
      {value}
    </Text>
  </View>
);

const SettingsScreen: React.FC = () => {
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' });
  const checkingRef = useRef<boolean>(false);

  const handleCheck = async (): Promise<void> => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setCheck({ kind: 'checking' });
    try {
      const res = await healthService.check();
      setCheck({ kind: 'ok', message: res.message ?? `status: ${res.status}` });
    } catch (e) {
      setCheck({ kind: 'fail', message: getErrorMessage(e) });
    } finally {
      checkingRef.current = false;
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Kết nối máy chủ</Text>
      <View style={styles.card}>
        <Row label="Chế độ dữ liệu" value={USE_MOCK ? 'Minh họa (mock, chưa gọi máy chủ)' : 'Gọi API thật'} />
        <Row label="Địa chỉ API" value={API_URL} />
        <Row label="Nguồn địa chỉ" value={API_URL_FROM_ENV ? 'File .env' : 'Mặc định theo nền tảng'} />
      </View>
      <Text style={styles.hint}>
        Đổi bằng file .env (EXPO_PUBLIC_USE_MOCK, EXPO_PUBLIC_API_URL) rồi chạy lại `npx expo start -c`. Điện thoại
        thật phải dùng IP LAN của máy tính, không dùng localhost hay 10.0.2.2.
      </Text>

      <Button
        title="Kiểm tra kết nối (GET /health)"
        iconName="pulse-outline"
        variant="secondary"
        onPress={(): void => void handleCheck()}
        loading={check.kind === 'checking'}
        style={styles.button}
      />

      {check.kind === 'ok' ? (
        <View style={[styles.result, styles.resultOk]}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.resultText}>Kết nối được backend: {check.message}</Text>
        </View>
      ) : null}
      {check.kind === 'fail' ? (
        <View style={[styles.result, styles.resultFail]}>
          <Ionicons name="close-circle" size={18} color={COLORS.danger} />
          <Text style={styles.resultText}>{check.message}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  section: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  card: { borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 12, color: COLORS.textSecondary },
  rowValue: { fontSize: 15, color: COLORS.textPrimary, marginTop: 2 },
  hint: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginTop: SPACING.sm },
  button: { marginTop: SPACING.lg },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: 12,
    borderRadius: RADIUS.sm,
  },
  resultOk: { backgroundColor: 'rgba(46,204,113,0.12)' },
  resultFail: { backgroundColor: 'rgba(231,76,60,0.12)' },
  resultText: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
});

export default SettingsScreen;
