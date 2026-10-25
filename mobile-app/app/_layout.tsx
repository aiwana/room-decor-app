import { Stack } from "expo-router";
import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "@/store/auth-store";

export default function RootLayout() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const restore = useAuthStore((s) => s.restore);
  const segments = useSegments();
  const router = useRouter();

  // Restore token from secure store on first mount
  useEffect(() => {
    restore();
  }, [restore]);

  // Auth guard: redirect between (auth) and (main) groups
  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";

    if (!isLoggedIn && !inAuthGroup) {
      // Not logged in but trying to access protected route
      router.replace("/(auth)/login");
    } else if (isLoggedIn && inAuthGroup) {
      // Logged in but on auth screen
      router.replace("/(main)");
    }
  }, [isLoggedIn, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}
