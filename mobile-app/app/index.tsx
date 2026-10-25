import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth-store";

export default function Index() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return <Redirect href={isLoggedIn ? "/(main)" : "/(auth)/login"} />;
}
