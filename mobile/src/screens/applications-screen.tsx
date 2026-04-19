import { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { LoadingState } from "@/src/components/ui/loading-state";
import { Screen } from "@/src/components/ui/screen";
import { useApplicationMutations, useApplications } from "@/src/hooks/use-mobile-features";
import { getApiErrorMessage } from "@/src/services/api";
import { theme } from "@/src/utils/theme";

const statuses = ["to_apply", "applied", "interview", "rejected", "offer"] as const;

export function ApplicationsScreen() {
  const query = useApplications();
  const { create, updateStatus } = useApplicationMutations();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  const handleCreate = async () => {
    if (!company.trim() || !role.trim()) {
      Alert.alert("Missing fields", "Company and role are required.");
      return;
    }

    try {
      await create.mutateAsync({
        company: company.trim(),
        role: role.trim(),
        status: "to_apply",
      });
      setCompany("");
      setRole("");
    } catch (error) {
      Alert.alert("Failed to create application", getApiErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Applications</Text>

      <Card title="Add Application">
        <Input label="Company" value={company} onChangeText={setCompany} />
        <Input label="Role" value={role} onChangeText={setRole} />
        <Button label={create.isPending ? "Saving..." : "Add"} onPress={() => void handleCreate()} disabled={create.isPending} />
      </Card>

      <Card title="Application List">
        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? <Text style={styles.errorText}>{getApiErrorMessage(query.error)}</Text> : null}
        {!query.isLoading && !query.isError && !items.length ? (
          <EmptyState title="No applications" description="Applications you add on web or mobile appear here." />
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.itemTitle}>{item.company}</Text>
              <Text style={styles.metric}>{item.role}</Text>
              <Text style={styles.metric}>Status: {item.status}</Text>
              <View style={styles.row}>
                {statuses.map((status) => (
                  <Button
                    key={`${item._id}-${status}`}
                    label={status}
                    variant={item.status === status ? "primary" : "outline"}
                    onPress={() => void updateStatus.mutateAsync({ id: item._id, status })}
                  />
                ))}
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
