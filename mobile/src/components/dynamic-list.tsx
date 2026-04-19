import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { ObjectView } from "@/src/components/object-view";
import { type UnknownRecord } from "@/src/types/api";
import { theme } from "@/src/utils/theme";

interface DynamicListProps {
  moduleName: string;
  items: UnknownRecord[];
}

function readId(item: UnknownRecord) {
  const id = item._id ?? item.id;
  if (typeof id === "string") {
    return id;
  }

  if (typeof id === "number") {
    return String(id);
  }

  return null;
}

export function DynamicList({ moduleName, items }: DynamicListProps) {
  const router = useRouter();

  const handleOpenDetails = useCallback(
    (id: string) => {
      router.push(`/entity/${moduleName}/${id}`);
    },
    [moduleName, router],
  );

  if (!items.length) {
    return <EmptyState title="No records yet" description="New data from backend will appear here automatically." />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item, index) => readId(item) ?? `${moduleName}-${index}`}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const id = readId(item);

        return (
          <Card>
            <ObjectView data={item} />
            {id ? (
              <Pressable onPress={() => handleOpenDetails(id)} style={styles.linkButton}>
                <Text style={styles.linkText}>Open details</Text>
              </Pressable>
            ) : null}
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  separator: {
    height: theme.spacing.sm,
  },
  linkButton: {
    marginTop: theme.spacing.xs,
    alignSelf: "flex-start",
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
});
