/**
 * app/(auth)/_layout.tsx
 * Nhom Dang nhap / Dang ky. Da dang nhap thi chuyen thang vao app.
 */
import { Redirect, Stack } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'signedIn') return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
