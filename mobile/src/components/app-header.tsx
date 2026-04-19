import { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/hooks/use-auth";
import { theme } from "@/src/utils/theme";

export function AppHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const initials = useMemo(() => {
    const name = user?.name?.trim() ?? "";
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return "U";
    }
    return words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }, [user?.name]);

  const openNotifications = () => {
    Alert.alert(
      "Notifications",
      "• New streak milestone! You've completed 7 days of consistent practice.\n\n• Application update: Google moved your application to interview stage.\n\n• Task reminder: You have 3 tasks due today.",
    );
  };

  const openUserMenu = () => {
    Alert.alert("Account", undefined, [
      { text: "Settings", onPress: () => router.push("/(app)/(tabs)/settings") },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => void logout(),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={styles.header}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={theme.colors.mutedText} style={styles.searchIcon} />
        <TextInput
          editable={false}
          placeholder="Search anything..."
          placeholderTextColor={theme.colors.mutedText}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.actions}>
        <Pressable onPress={openNotifications} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </Pressable>

        <Pressable onPress={openUserMenu} style={styles.avatarOuter} hitSlop={8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    minHeight: 56,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.sm,
    minHeight: 36,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 15,
    color: theme.colors.text,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  iconBtn: {
    position: "relative",
    padding: theme.spacing.xs,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.primaryForeground,
    fontSize: 10,
    fontWeight: "600",
  },
  avatarOuter: {
    marginLeft: theme.spacing.xs,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.colors.primary}33`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
});
