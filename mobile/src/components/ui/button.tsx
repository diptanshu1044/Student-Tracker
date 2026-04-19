import { Pressable, StyleSheet, Text } from "react-native";

import { theme } from "@/src/utils/theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline";
}

export function Button({ label, onPress, disabled, variant = "primary" }: ButtonProps) {
  const isOutline = variant === "outline";
  const isSecondary = variant === "secondary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isOutline ? styles.outlineButton : isSecondary ? styles.secondaryButton : styles.primaryButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.text,
          isOutline ? styles.outlineText : isSecondary ? styles.secondaryText : styles.primaryText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.border,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderColor: theme.colors.border,
  },
  primaryText: {
    color: theme.colors.primaryForeground,
  },
  secondaryText: {
    color: theme.colors.secondaryForeground,
  },
  outlineText: {
    color: theme.colors.text,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.8,
  },
});
