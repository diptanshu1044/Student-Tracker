import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/src/hooks/use-auth";

export default function AuthLayout() {
  const { hydrated, isAuthenticated } = useAuth();

  if (hydrated && isAuthenticated) {
    return <Redirect href="/(app)/(tabs)/dashboard" />;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: "Login", headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: "Sign up", headerShown: false }} />
    </Stack>
  );
}
