import { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { LoadingState } from "@/src/components/ui/loading-state";
import { Screen } from "@/src/components/ui/screen";
import { useJobsData, useJobsMutations } from "@/src/hooks/use-mobile-features";
import { getApiErrorMessage } from "@/src/services/api";
import { theme } from "@/src/utils/theme";

const statuses = ["applied", "oa", "interview", "rejected", "offer"] as const;

export function JobsScreen() {
  const { jobs, stats } = useJobsData();
  const mutations = useJobsMutations();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const items = useMemo(() => jobs.data?.items ?? [], [jobs.data?.items]);

  const handleCreate = async () => {
    if (!company.trim() || !role.trim()) {
      Alert.alert("Missing fields", "Company and role are required.");
      return;
    }

    try {
      await mutations.create.mutateAsync({
        companyName: company.trim(),
        role: role.trim(),
        status: "applied",
        priority: "medium",
      });
      setCompany("");
      setRole("");
    } catch (error) {
      Alert.alert("Failed to add job", getApiErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Jobs</Text>

      <Card title="Add Job">
        <Input label="Company" value={company} onChangeText={setCompany} />
        <Input label="Role" value={role} onChangeText={setRole} />
        <Button
          label={mutations.create.isPending ? "Saving..." : "Add"}
          onPress={() => void handleCreate()}
          disabled={mutations.create.isPending}
        />
      </Card>

      <Card title="Stats">
        {stats.isLoading ? <LoadingState /> : null}
        {stats.isError ? <Text style={styles.errorText}>{getApiErrorMessage(stats.error)}</Text> : null}
        {stats.data ? (
          <>
            <Text style={styles.metric}>Applications: {stats.data.totalApplications}</Text>
            <Text style={styles.metric}>Interviews: {stats.data.interviews}</Text>
            <Text style={styles.metric}>Offers: {stats.data.offers}</Text>
          </>
        ) : null}
      </Card>

      <Card title="Jobs List">
        {jobs.isLoading ? <LoadingState /> : null}
        {jobs.isError ? <Text style={styles.errorText}>{getApiErrorMessage(jobs.error)}</Text> : null}
        {!jobs.isLoading && !jobs.isError && !items.length ? (
          <EmptyState title="No jobs yet" description="Jobs added on web or mobile appear here." />
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.itemTitle}>{item.companyName}</Text>
              <Text style={styles.metric}>{item.role}</Text>
              <Text style={styles.metric}>Status: {item.status}</Text>
              <View style={styles.row}>
                {statuses.map((status) => (
                  <Button
                    key={`${item._id}-${status}`}
                    label={status}
                    variant={item.status === status ? "primary" : "outline"}
                    onPress={() => void mutations.updateStatus.mutateAsync({ id: item._id, status })}
                  />
                ))}
              </View>
              <Button label="Delete" variant="outline" onPress={() => void mutations.delete.mutateAsync(item._id)} />
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
