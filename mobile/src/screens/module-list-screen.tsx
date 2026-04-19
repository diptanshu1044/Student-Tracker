import { StyleSheet, Text } from "react-native";

import { DynamicList } from "@/src/components/dynamic-list";
import { EmptyState } from "@/src/components/ui/empty-state";
import { LoadingState } from "@/src/components/ui/loading-state";
import { Screen } from "@/src/components/ui/screen";
import { type ModuleName, useModuleData } from "@/src/hooks/use-module-data";
import { getApiErrorMessage } from "@/src/services/api";
import { theme } from "@/src/utils/theme";

interface ModuleListScreenProps {
  moduleName: ModuleName;
  title: string;
}

export function ModuleListScreen({ moduleName, title }: ModuleListScreenProps) {
  const query = useModuleData(moduleName);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>{title}</Text>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <EmptyState title="Could not load data" description={getApiErrorMessage(query.error)} /> : null}
      {!query.isLoading && !query.isError ? <DynamicList moduleName={moduleName} items={query.data} /> : null}
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
