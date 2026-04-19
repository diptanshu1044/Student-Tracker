import { type PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/src/utils/theme";

interface CardProps extends PropsWithChildren {
  title?: string;
  /** Streak card on web uses primary border / tint. */
  variant?: "default" | "highlight";
}

export function Card({ title, children, variant = "default" }: CardProps) {
  return (
    <View style={[styles.card, variant === "highlight" && styles.cardHighlight]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardHighlight: {
    borderColor: `${theme.colors.primary}44`,
    backgroundColor: `${theme.colors.primary}0d`,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
});
