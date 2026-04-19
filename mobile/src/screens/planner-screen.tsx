import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { LoadingState } from "@/src/components/ui/loading-state";
import { Screen } from "@/src/components/ui/screen";
import { usePlannerData, usePlannerMutations } from "@/src/hooks/use-mobile-features";
import { getApiErrorMessage } from "@/src/services/api";
import { schedulePlannerReminder } from "@/src/services/notifications";
import { theme } from "@/src/utils/theme";

export function PlannerScreen() {
  const [profileId, setProfileId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { profiles, tasks } = usePlannerData(profileId);
  const { createTask, updateTaskStatus } = usePlannerMutations();

  useEffect(() => {
    if (!profileId && profiles.data?.length) {
      setProfileId(profiles.data[0]._id);
    }
  }, [profileId, profiles.data]);

  const taskItems = useMemo(() => tasks.data?.items ?? [], [tasks.data?.items]);

  const handleCreateTask = async () => {
    if (!profileId || !title.trim()) {
      Alert.alert("Missing fields", "Select a profile and provide a title.");
      return;
    }

    const now = new Date();
    const start = new Date(now.getTime() + 5 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    try {
      const created = await createTask.mutateAsync({
        profileId,
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        priority: "medium",
        reminderTime: start.toISOString(),
      });

      await schedulePlannerReminder({
        taskId: created._id,
        title: created.title,
        body: "Planner task starts soon",
        reminderTimeIso: created.reminderTime ?? created.startTime,
      });

      setTitle("");
      setDescription("");
    } catch (error) {
      Alert.alert("Failed to create task", getApiErrorMessage(error));
    }
  };

  return (
    <Screen appChrome>
      <Text style={styles.title}>Planner</Text>

      <Card title="Profiles">
        {profiles.isLoading ? <LoadingState /> : null}
        {profiles.isError ? <Text style={styles.errorText}>{getApiErrorMessage(profiles.error)}</Text> : null}
        <View style={styles.row}>
          {(profiles.data ?? []).map((profile) => (
            <Button
              key={profile._id}
              label={profile.name}
              variant={profileId === profile._id ? "primary" : "outline"}
              onPress={() => setProfileId(profile._id)}
            />
          ))}
        </View>
      </Card>

      <Card title="Add Task">
        <Input label="Task title" value={title} onChangeText={setTitle} />
        <Input label="Description" value={description} onChangeText={setDescription} />
        <Text style={styles.helper}>
          Start time is set to 5 minutes from now and duration to 1 hour for quick mobile entry.
        </Text>
        <Button
          label={createTask.isPending ? "Creating..." : "Create Task"}
          onPress={() => void handleCreateTask()}
          disabled={createTask.isPending}
        />
      </Card>

      <Card title="Tasks">
        {tasks.isLoading ? <LoadingState /> : null}
        {tasks.isError ? <Text style={styles.errorText}>{getApiErrorMessage(tasks.error)}</Text> : null}
        {!tasks.isLoading && !tasks.isError && !taskItems.length ? (
          <EmptyState title="No tasks" description="Create a task or sync from web to populate this list." />
        ) : null}

        <FlatList
          data={taskItems}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.metric}>Status: {item.status}</Text>
              <Text style={styles.metric}>Priority: {item.priority}</Text>
              <View style={styles.row}>
                <Button
                  label="Pending"
                  variant={item.status === "pending" ? "primary" : "outline"}
                  onPress={() => void updateTaskStatus.mutateAsync({ id: item._id, status: "pending" })}
                />
                <Button
                  label="Completed"
                  variant={item.status === "completed" ? "primary" : "outline"}
                  onPress={() => void updateTaskStatus.mutateAsync({ id: item._id, status: "completed" })}
                />
                <Button
                  label="Missed"
                  variant={item.status === "missed" ? "primary" : "outline"}
                  onPress={() => void updateTaskStatus.mutateAsync({ id: item._id, status: "missed" })}
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
  list: {
    gap: theme.spacing.sm,
  },
  helper: {
    color: theme.colors.mutedText,
    fontSize: 12,
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
