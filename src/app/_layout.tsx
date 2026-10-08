import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/screens/HomeScreen/styles';

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.background,
    primary: COLORS.accent,
    text: COLORS.textPrimary,
    border: 'rgba(255,255,255,0.08)',
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={AppTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}