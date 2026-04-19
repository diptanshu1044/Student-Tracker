import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { type UnknownRecord } from "@/src/types/api";
import { theme } from "@/src/utils/theme";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    if (typeof value[0] === "object") {
      return `${value.length} items`;
    }

    return value.map((item) => String(item)).join(", ");
  }

  if (typeof value === "object") {
    return "Object";
  }

  return String(value);
}

interface ObjectViewProps {
  data: UnknownRecord;
  hiddenKeys?: string[];
}

export function ObjectView({ data, hiddenKeys = ["_id", "id"] }: ObjectViewProps) {
  const entries = Object.entries(data).filter(([key]) => !hiddenKeys.includes(key));

  return (
    <View style={styles.container}>
      {entries.map(([key, value]) => {
        const nested = typeof value === "object" && value !== null && !Array.isArray(value);

        return (
          <Fragment key={key}>
            <View style={styles.row}>
              <Text style={styles.key}>{key}</Text>
              <Text style={styles.value}>{formatValue(value)}</Text>
            </View>
            {nested ? (
              <View style={styles.nested}>
                <ObjectView data={value as UnknownRecord} hiddenKeys={hiddenKeys} />
              </View>
            ) : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  key: {
    flex: 1,
    color: theme.colors.mutedText,
    textTransform: "capitalize",
    fontSize: 13,
  },
  value: {
    flex: 2,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  nested: {
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    marginLeft: theme.spacing.md,
    paddingLeft: theme.spacing.sm,
  },
});
