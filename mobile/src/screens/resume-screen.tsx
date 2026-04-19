import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Alert, FlatList, StyleSheet, Text } from "react-native";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { LoadingState } from "@/src/components/ui/loading-state";
import { Screen } from "@/src/components/ui/screen";
import { useResumeData, useResumeMutations } from "@/src/hooks/use-mobile-features";
import { getApiErrorMessage } from "@/src/services/api";
import { theme } from "@/src/utils/theme";

export function ResumeScreen() {
  const { resumes, stats, comparison } = useResumeData();
  const { upload, setDefault, delete: deleteResume } = useResumeMutations();
  const [isPicking, setIsPicking] = useState(false);

  const handleUpload = async () => {
    try {
      setIsPicking(true);
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const [file] = result.assets;
      await upload.mutateAsync({
        fileUri: file.uri,
        fileName: file.name,
        mimeType: file.mimeType,
      });
    } catch (error) {
      Alert.alert("Upload failed", getApiErrorMessage(error));
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <Screen appChrome>
      <Text style={styles.title}>Resume</Text>

      <Card title="Upload">
        <Button
          label={upload.isPending || isPicking ? "Uploading..." : "Pick & Upload Resume"}
          onPress={() => void handleUpload()}
          disabled={upload.isPending || isPicking}
        />
      </Card>

      <Card title="Stats">
        {stats.isLoading ? <LoadingState /> : null}
        {stats.data ? (
          <>
            <Text style={styles.metric}>Tracked resumes: {stats.data.length}</Text>
            <Text style={styles.metric}>
              Total uses: {stats.data.reduce((sum, item) => sum + item.totalUsed, 0)}
            </Text>
          </>
        ) : null}
      </Card>

      <Card title="Comparison Snapshot">
        {comparison.data?.slice(0, 3).map((item) => (
          <Text key={item.resumeId} style={styles.metric}>
            {item.name}: response {item.responseRate}% | interview {item.interviewRate}%
          </Text>
        ))}
      </Card>

      <Card title="Resume Library">
        {resumes.isLoading ? <LoadingState /> : null}
        {resumes.isError ? <Text style={styles.errorText}>{getApiErrorMessage(resumes.error)}</Text> : null}
        {!resumes.isLoading && !resumes.isError && !(resumes.data ?? []).length ? (
          <EmptyState title="No resumes" description="Upload from mobile or web to see files here." />
        ) : null}

        <FlatList
          data={resumes.data ?? []}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.metric}>Version: {item.version}</Text>
              <Text style={styles.metric}>Default: {item.isDefault ? "Yes" : "No"}</Text>
              <Button label="Set as Default" variant="outline" onPress={() => void setDefault.mutateAsync(item._id)} />
              <Button label="Delete" variant="outline" onPress={() => void deleteResume.mutateAsync(item._id)} />
            </Card>
          )}
        />
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
  list: {
    gap: theme.spacing.sm,
  },
  metric: {
    color: theme.colors.text,
  },
  itemTitle: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  errorText: {
    color: theme.colors.danger,
  },
});
