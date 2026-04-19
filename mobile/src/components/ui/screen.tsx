import { type PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/src/components/app-header";
import { theme } from "@/src/utils/theme";

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  /** Top bar matching web mobile TopNavbar (search, notifications, account). */
  appChrome?: boolean;
}

export function Screen({ children, scroll = true, appChrome = false }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {appChrome ? <AppHeader /> : null}
      {scroll ? <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView> : <View style={styles.content}>{children}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
});
