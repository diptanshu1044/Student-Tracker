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

export function SignupScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      await signUp({ name: name.trim(), email: email.trim(), password });
      router.replace("/(app)/(tabs)/dashboard");
    } catch (error) {
      Alert.alert("Signup failed", getApiErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Create your StudentOS account</Text>
      <Card>
        <Input label="Name" value={name} onChangeText={setName} />
        <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Button label={isLoading ? "Creating account..." : "Sign up"} onPress={() => void handleSubmit()} disabled={isLoading || !name || !email || !password} />
      </Card>
      <Text style={styles.linkText}>
        Already have an account? <Link href="/(auth)/login">Sign in</Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  linkText: {
    color: theme.colors.mutedText,
    textAlign: "center",
  },
});
