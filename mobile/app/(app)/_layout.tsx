import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/src/hooks/use-auth";

export default function AppLayout() {
  const { hydrated, isAuthenticated } = useAuth();

  if (hydrated && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="entity/[module]/[id]" options={{ title: "Details" }} />
    </Stack>
  );
}
