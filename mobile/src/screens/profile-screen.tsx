import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, StyleSheet, Text } from "react-native";

import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { LoadingState } from "@/src/components/ui/loading-state";
import { ObjectView } from "@/src/components/object-view";
import { Screen } from "@/src/components/ui/screen";
import { useAuth } from "@/src/hooks/use-auth";
import { getApiErrorMessage, getMe, uploadResume } from "@/src/services/api";
import { theme } from "@/src/utils/theme";

export function ProfileScreen() {
  const { logout } = useAuth();
  const [lastUploadName, setLastUploadName] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadResume,
    onSuccess: (_, variables) => {
      setLastUploadName(variables.fileName);
      Alert.alert("Upload complete", `${variables.fileName} uploaded successfully.`);
    },
    onError: (error) => {
      Alert.alert("Upload failed", getApiErrorMessage(error));
    },
  });

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const [file] = result.assets;
    await uploadMutation.mutateAsync({
      fileUri: file.uri,
      fileName: file.name,
      mimeType: file.mimeType,
    });
  };

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Card title="Account">
        {meQuery.isLoading ? <LoadingState /> : null}
        {meQuery.isError ? <EmptyState title="Could not fetch profile" description={getApiErrorMessage(meQuery.error)} /> : null}
        {meQuery.data ? <ObjectView data={meQuery.data} /> : null}
      </Card>

      <Card title="Resume Upload">
        <Text style={styles.helperText}>Upload files directly to existing backend resume endpoints.</Text>
        <Button label={uploadMutation.isPending ? "Uploading..." : "Pick and upload file"} onPress={() => void handlePickFile()} disabled={uploadMutation.isPending} />
        {lastUploadName ? <Text style={styles.uploadText}>Last uploaded: {lastUploadName}</Text> : null}
      </Card>

      <Button label="Logout" onPress={() => void logout()} variant="outline" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  helperText: {
    color: theme.colors.mutedText,
  },
  uploadText: {
    color: theme.colors.text,
    fontWeight: "500",
  },
});
