import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getModuleList } from "@/src/services/api";
import { type UnknownRecord } from "@/src/types/api";

export type ModuleName = "dsa" | "applications" | "planner" | "jobs" | "resume";

export function useModuleData(moduleName: ModuleName) {
  const query = useQuery({
    queryKey: ["module", moduleName],
    queryFn: () => getModuleList(moduleName, { page: 1, limit: 50 }),
  });

  const data = useMemo<UnknownRecord[]>(() => query.data ?? [], [query.data]);

  return {
    ...query,
    data,
  };
}
