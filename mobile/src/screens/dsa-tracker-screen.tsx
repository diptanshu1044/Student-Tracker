import { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { LoadingState } from "@/src/components/ui/loading-state";
import { Screen } from "@/src/components/ui/screen";
import { useDsaData, useDsaMutations } from "@/src/hooks/use-mobile-features";
import { getApiErrorMessage } from "@/src/services/api";
import { type DsaProblemStatus } from "@/src/types/api";
import { theme } from "@/src/utils/theme";

const statuses: DsaProblemStatus[] = ["attempted", "revision", "solved"];

export function DsaTrackerScreen() {
  const { logs, stats } = useDsaData();
  const { createLog, updateLog, deleteLog } = useDsaMutations();

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [platform, setPlatform] = useState<"leetcode" | "gfg">("leetcode");
  const [status, setStatus] = useState<DsaProblemStatus>("attempted");

  const problems = useMemo(() => logs.data?.items ?? [], [logs.data?.items]);

  const handleCreate = async () => {
    if (!title.trim() || !topic.trim()) {
      Alert.alert("Missing fields", "Title and topic are required.");
      return;
    }

    try {
      await createLog.mutateAsync({
        createProblem: {
          title: title.trim(),
          topic: topic.trim(),
          difficulty,
          platform,
        },
        status,
        attempts: 1,
      });
      setTitle("");
      setTopic("");
    } catch (error) {
      Alert.alert("Failed to create log", getApiErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>DSA Tracker</Text>

      <Card title="Summary">
        {stats.isLoading ? <LoadingState /> : null}
        {stats.isError ? <Text style={styles.errorText}>{getApiErrorMessage(stats.error)}</Text> : null}
        {stats.data ? (
          <>
            <Text style={styles.metric}>Solved: {stats.data.totalSolved}</Text>
            <Text style={styles.metric}>Attempted: {stats.data.totalAttempted}</Text>
            <Text style={styles.metric}>Streak: {stats.data.currentStreak}</Text>
          </>
        ) : null}
      </Card>

      <Card title="Add Problem Log">
        <Input label="Title" value={title} onChangeText={setTitle} />
        <Input label="Topic" value={topic} onChangeText={setTopic} />
        <View style={styles.row}>
          {(["easy", "medium", "hard"] as const).map((item) => (
            <Button
              key={item}
              label={item}
              variant={difficulty === item ? "primary" : "outline"}
              onPress={() => setDifficulty(item)}
            />
          ))}
        </View>
        <View style={styles.row}>
          {(["leetcode", "gfg"] as const).map((item) => (
            <Button
              key={item}
              label={item}
              variant={platform === item ? "primary" : "outline"}
              onPress={() => setPlatform(item)}
            />
          ))}
        </View>
        <View style={styles.row}>
          {statuses.map((item) => (
            <Button
              key={item}
              label={item}
              variant={status === item ? "primary" : "outline"}
              onPress={() => setStatus(item)}
            />
          ))}
        </View>
        <Button
          label={createLog.isPending ? "Saving..." : "Add Log"}
          onPress={() => void handleCreate()}
          disabled={createLog.isPending}
        />
      </Card>

      <Card title="Problem Logs">
        {logs.isLoading ? <LoadingState /> : null}
        {logs.isError ? <Text style={styles.errorText}>{getApiErrorMessage(logs.error)}</Text> : null}
        {!logs.isLoading && !logs.isError && !problems.length ? (
          <EmptyState title="No problems yet" description="Start by adding your first tracked problem." />
        ) : null}

        <FlatList
          data={problems}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.itemTitle}>{item.problemId?.title ?? "Untitled problem"}</Text>
              <Text style={styles.metric}>Topic: {item.problemId?.topic ?? "General"}</Text>
              <Text style={styles.metric}>Status: {item.status}</Text>
              <View style={styles.row}>
                <Button
                  label="Mark solved"
                  variant="outline"
                  onPress={() => void updateLog.mutateAsync({ id: item._id, input: { status: "solved" } })}
                />
                <Button
                  label="Delete"
                  variant="outline"
                  onPress={() =>
                    Alert.alert("Delete log", "Remove this problem log?", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => void deleteLog.mutateAsync(item._id),
                      },
                    ])
                  }
                />
              </View>
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
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  metric: {
    color: theme.colors.text,
  },
  itemTitle: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  list: {
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.danger,
  },
});
