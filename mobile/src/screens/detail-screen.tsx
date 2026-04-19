import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text } from "react-native";

import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { LoadingState } from "@/src/components/ui/loading-state";
import { ObjectView } from "@/src/components/object-view";
import { Screen } from "@/src/components/ui/screen";
import { getApiErrorMessage, getRecordById } from "@/src/services/api";
import { theme } from "@/src/utils/theme";

const modulePathMap: Record<string, string> = {
  tracker: "/dsa",
  planner: "/planner/tasks-v2",
  jobs: "/jobs",
};

export function DetailScreen() {
  const params = useLocalSearchParams<{ module: string; id: string }>();
  const modulePath = modulePathMap[params.module ?? ""];

  const query = useQuery({
    queryKey: ["detail", params.module, params.id],
    queryFn: () => getRecordById(modulePath, String(params.id)),
    enabled: Boolean(modulePath && params.id),
  });

  return (
    <Screen>
      <Text style={styles.title}>Details</Text>
      {!modulePath ? <EmptyState title="Unsupported module" description="This detail route is not mapped to a backend path." /> : null}
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <EmptyState title="Could not fetch details" description={getApiErrorMessage(query.error)} /> : null}
      {query.data ? (
        <Card>
          <ObjectView data={query.data} />
        </Card>
      ) : null}
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
