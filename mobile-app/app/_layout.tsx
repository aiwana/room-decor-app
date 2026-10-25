/**
 * app/_layout.tsx
 * Root layout: Theme toi + GestureHandler (keo tha trong trinh chinh sua) + Stack.
 *
 *   (auth)  -> Dang nhap / Dang ky (chi vao duoc khi CHUA dang nhap)
 *   (main)  -> Toan bo app (chi vao duoc khi DA dang nhap)
 *
 * Mo app: khoi phuc phien tu token da luu (auth-store.restore).
 * Viec chuyen huong nam trong _layout cua tung nhom (Redirect), vi Expo Router 4
 * (SDK 52) chua co Stack.Protected.
 */
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { COLORS } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.background,
    primary: COLORS.accent,
    text: COLORS.textPrimary,
    border: COLORS.border,
  },
};

export default function RootLayout() {
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={AppTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
});
