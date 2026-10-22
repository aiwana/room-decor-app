import { Tabs } from "expo-router";

export default function MainLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color }) => null }}
      />
      <Tabs.Screen
        name="furniture"
        options={{ title: "Furniture", tabBarIcon: ({ color }) => null }}
      />
      <Tabs.Screen
        name="capture"
        options={{ title: "Capture", tabBarIcon: ({ color }) => null }}
      />
      <Tabs.Screen
        name="designs"
        options={{ title: "Designs", tabBarIcon: ({ color }) => null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => null }}
      />
      <Tabs.Screen
        name="editor/[id]"
        options={{ title: "Editor", tabBarButton: () => null, href: null }}
      />
    </Tabs>
  );
}
