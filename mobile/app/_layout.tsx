import { useEffect } from "react";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AppProviders } from "@/src/components/app-providers";
import { useAuth } from "@/src/hooks/use-auth";
import { registerPushNotifications } from "@/src/services/notifications";
import { theme } from "@/src/utils/theme";

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.primary,
  },
};

export default function RootLayout() {
  const { bootstrap, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) {
      void bootstrap();
    }
  }, [bootstrap, hydrated]);

  useEffect(() => {
    void registerPushNotifications();
  }, []);

  return (
    <AppProviders>
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </AppProviders>
  );
}
