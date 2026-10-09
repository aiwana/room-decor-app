/**
 * src/app/_layout.tsx
 * Root layout: Theme + DesignProvider + Stack.
 *
 *   (tabs)                 -> Home | AI Decor | History | Profile
 *   result/[id]            -> Ket qua 1 thiet ke
 *   catalog/index          -> Catalog vat lieu (module phu)
 *   catalog/[productId]    -> Chi tiet san pham
 *   quote-request          -> Form bao gia (modal)
 */
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { COLORS } from '@/constants/colors';
import { DesignProvider } from '@/context/DesignContext';

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
  return (
    <ThemeProvider value={AppTheme}>
      <DesignProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            headerTintColor: COLORS.textPrimary,
            headerStyle: { backgroundColor: COLORS.background },
            headerBackTitle: 'Quay lại',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="result/[id]" options={{ headerShown: true, title: 'Kết quả thiết kế' }} />
          <Stack.Screen name="catalog/index" options={{ headerShown: true, title: 'Vật liệu & sản phẩm' }} />
          <Stack.Screen name="catalog/[productId]" options={{ headerShown: true, title: 'Chi tiết sản phẩm' }} />
          <Stack.Screen
            name="quote-request"
            options={{ headerShown: true, title: 'Yêu cầu báo giá', presentation: 'modal' }}
          />
          <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Không tìm thấy' }} />
        </Stack>
      </DesignProvider>
    </ThemeProvider>
  );
}
