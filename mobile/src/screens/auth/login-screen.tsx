import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { Link, useRouter } from "expo-router";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Screen } from "@/src/components/ui/screen";
import { useAuth } from "@/src/hooks/use-auth";
import { getApiErrorMessage } from "@/src/services/api";
import { theme } from "@/src/utils/theme";

export function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      await signIn({ email: email.trim(), password });
      router.replace("/(app)/(tabs)/dashboard");
    } catch (error) {
      Alert.alert("Login failed", getApiErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>StudentOS</Text>
      <Text style={styles.subtitle}>Sign in to sync your learning and career workflows.</Text>
      <Card>
        <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Button label={isLoading ? "Signing in..." : "Sign in"} onPress={() => void handleSubmit()} disabled={isLoading || !email || !password} />
      </Card>
      <Text style={styles.linkText}>
        New here? <Link href="/(auth)/signup">Create account</Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.mutedText,
  },
  linkText: {
    color: theme.colors.mutedText,
    textAlign: "center",
  },
});
