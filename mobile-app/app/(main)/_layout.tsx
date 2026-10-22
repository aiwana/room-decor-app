/**
 * app/(main)/_layout.tsx
 * Phan chinh cua app, BAT BUOC dang nhap:
 *   - dang khoi phuc phien -> man hinh cho
 *   - loi khoi phuc (mat mang...) -> bao loi + Thu lai / Dang xuat
 *   - chua dang nhap -> chuyen ve /login
 *
 *   (tabs)            -> Home | Thiet ke moi | Thiet ke cua toi | Ho so
 *   editor/[id]       -> Trinh chinh sua 2D
 *   furniture/index   -> Danh muc noi that
 *   furniture/[id]    -> Chi tiet noi that
 *   settings          -> Cai dat & ket noi may chu
 */
import { StyleSheet, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import Button from '@/components/common/Button';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { COLORS, SPACING } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';

export default function MainLayout() {
  const status = useAuthStore((s) => s.status);
  const restoreError = useAuthStore((s) => s.restoreError);
  const restore = useAuthStore((s) => s.restore);
  const logout = useAuthStore((s) => s.logout);

  if (status === 'restoring') return <LoadingView message="Đang kiểm tra đăng nhập..." />;

  if (status === 'error') {
    return (
      <View style={styles.error}>
        <ErrorView message={restoreError ?? 'Không khôi phục được phiên đăng nhập.'} onRetry={() => void restore()} />
        <Button title="Đăng xuất" variant="ghost" onPress={() => void logout()} style={styles.logout} />
      </View>
    );
  }

  if (status === 'signedOut') return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: COLORS.textPrimary,
        headerStyle: { backgroundColor: COLORS.background },
        headerBackTitle: 'Quay lại',
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="editor/[id]" options={{ headerShown: true, title: 'Sắp xếp nội thất' }} />
      <Stack.Screen name="furniture/index" options={{ headerShown: true, title: 'Danh mục nội thất' }} />
      <Stack.Screen name="furniture/[id]" options={{ headerShown: true, title: 'Chi tiết nội thất' }} />
      <Stack.Screen name="settings" options={{ headerShown: true, title: 'Cài đặt' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, backgroundColor: COLORS.background },
  logout: { margin: SPACING.md },
});
