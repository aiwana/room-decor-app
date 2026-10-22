import { Stack } from "expo-router";
import { useAuthStore } from "@/store/auth-store";

export default function RootLayout() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected name="(auth)" condition={!isLoggedIn}>
        <Stack.Protected name="(main)" condition={isLoggedIn}>
          {/* Placeholder - content in sub-layouts */}
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}
