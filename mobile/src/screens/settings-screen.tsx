import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, StyleSheet, Text } from "react-native";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { LoadingState } from "@/src/components/ui/loading-state";
import { ObjectView } from "@/src/components/object-view";
import { Screen } from "@/src/components/ui/screen";
import { useAuth } from "@/src/hooks/use-auth";
import { getApiErrorMessage, getMe, resendVerificationEmail } from "@/src/services/api";
import { registerPushNotifications } from "@/src/services/notifications";
import { theme } from "@/src/utils/theme";

export function SettingsScreen() {
  const { logout } = useAuth();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const resendMutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: (result) => {
      if (result.reason === "already_verified") {
        Alert.alert("Already verified", "Your email is already verified.");
        return;
      }

      Alert.alert("Verification email sent", "Please check your inbox.");
    },
    onError: (error) => {
      Alert.alert("Could not resend", getApiErrorMessage(error));
    },
  });

  const registerNotifications = async () => {
    const result = await registerPushNotifications();
    if (!result?.ok) {
      Alert.alert("Notifications", result?.reason ?? "Unable to enable notifications.");
      return;
    }

    Alert.alert("Notifications enabled", result.token ? "Push token generated successfully." : "Permissions granted.");
  };

  return (
    <Screen appChrome>
      <Text style={styles.title}>Settings</Text>

      <Card title="Account">
        {meQuery.isLoading ? <LoadingState /> : null}
        {meQuery.isError ? <EmptyState title="Could not load account" description={getApiErrorMessage(meQuery.error)} /> : null}
        {meQuery.data ? <ObjectView data={meQuery.data} /> : null}
      </Card>

      <Card title="Actions">
        <Button
          label={resendMutation.isPending ? "Sending..." : "Resend verification email"}
          onPress={() => void resendMutation.mutateAsync()}
          disabled={resendMutation.isPending}
        />
        <Button label="Enable notifications" variant="outline" onPress={() => void registerNotifications()} />
        <Button label="Logout" variant="outline" onPress={() => void logout()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
});
