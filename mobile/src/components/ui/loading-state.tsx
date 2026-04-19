import { ActivityIndicator, StyleSheet, View } from "react-native";

import { theme } from "@/src/utils/theme";

export function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
