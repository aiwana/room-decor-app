/**
 * app/_layout.tsx
 * Root layout: Theme toi + GestureHandler (keo tha trong trinh chinh sua) + Stack.
 *
 *   (auth)  -> Dang nhap / Dang ky (chi vao duoc khi CHUA dang nhap)
 *   (main)  -> Toan bo app (chi vao duoc khi DA dang nhap)
 *
 * Mo app: khoi phuc phien tu token da luu (auth-store.restore) + nap font Be Vietnam Pro
 * (giu man hinh splash toi khi nap xong, toi da 3 giay; loi nap font thi dung font he thong).
 * Viec chuyen huong nam trong _layout cua tung nhom (Redirect), vi Expo Router 4
 * (SDK 52) chua co Stack.Protected.
 */
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { COLORS } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';

// Chi dua vao app 4 do dam dang dung (ca bo 18 file font se lam app nang them ~3 MB)
const APP_FONTS = {
  BeVietnamPro_400Regular: require('@expo-google-fonts/be-vietnam-pro/BeVietnamPro_400Regular.ttf'),
  BeVietnamPro_500Medium: require('@expo-google-fonts/be-vietnam-pro/BeVietnamPro_500Medium.ttf'),
  BeVietnamPro_600SemiBold: require('@expo-google-fonts/be-vietnam-pro/BeVietnamPro_600SemiBold.ttf'),
  BeVietnamPro_700Bold: require('@expo-google-fonts/be-vietnam-pro/BeVietnamPro_700Bold.ttf'),
};
const FONT_TIMEOUT_MS = 3000;

SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  const [timedOut, setTimedOut] = useState(false);
  const ready = fontsLoaded || Boolean(fontError) || timedOut;

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

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
