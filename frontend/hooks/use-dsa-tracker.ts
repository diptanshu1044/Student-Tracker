"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"
import {
  deleteUserProblem,
  getDsaActivity,
  getDsaStats,
  getDsaWeakTopics,
  getProblemCatalog,
  getUserProblems,
  trackUserProblem,
  updateUserProblem,
  type DsaProblemStatus,
  type UserProblemRecord,
} from "@/lib/api"

export const dsaQueryKeys = {
  all: ["dsa"] as const,
  catalog: () => [...dsaQueryKeys.all, "catalog"] as const,
  problems: (filters: {
    page: number
    limit: number
    difficulty: string
    topic: string
    status: string
    search: string
  }) => [...dsaQueryKeys.all, "problems", filters] as const,
  stats: () => [...dsaQueryKeys.all, "stats"] as const,
  weakTopics: () => [...dsaQueryKeys.all, "weak-topics"] as const,
  activity: () => [...dsaQueryKeys.all, "activity"] as const,
}

function toStatusOrUndefined(value: string): DsaProblemStatus | undefined {
  if (value === "all") {
    return undefined
  }

  if (value === "attempted") {
    return "attempted"
  }

  if (value === "revision") {
    return "revision"
  }

  if (value === "solved") {
    return "solved"
  }

  return undefined
}

export function useDsaProblemCatalog(limit = 500) {
  return useQuery({
    queryKey: [...dsaQueryKeys.catalog(), limit],
    queryFn: async () => getProblemCatalog({ page: 1, limit }),
  })
}

export function useDsaProblems(input: {
  page: number
  limit: number
  difficulty: string
  topic: string
  status: string
  search: string
}) {
  return useQuery({
    queryKey: dsaQueryKeys.problems(input),
    queryFn: async () =>
      getUserProblems({
        page: input.page,
        limit: input.limit,
        difficulty: input.difficulty === "all" ? undefined : (input.difficulty as "easy" | "medium" | "hard"),
        topic: input.topic === "all" ? undefined : input.topic,
        status: toStatusOrUndefined(input.status),
        search: input.search.trim() ? input.search.trim() : undefined,
      }),
  })
}

export function useDsaActivity() {
  return useQuery({
    queryKey: dsaQueryKeys.activity(),
    queryFn: getDsaActivity,
  })
}

export function useDsaWeakTopics() {
  return useQuery({
    queryKey: dsaQueryKeys.weakTopics(),
    queryFn: getDsaWeakTopics,
  })
}

export function useDsaStats() {
  return useQuery({
    queryKey: dsaQueryKeys.stats(),
    queryFn: getDsaStats,
  })
}

export function useCreateDsaProblemLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: trackUserProblem,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [...dsaQueryKeys.all, "problems"] })

      const snapshots = queryClient.getQueriesData({
        queryKey: [...dsaQueryKeys.all, "problems"],
      })

      for (const [queryKey, value] of snapshots) {
        if (!value || typeof value !== "object" || !("items" in value)) {
          continue
        }

        const typed = value as { items: UserProblemRecord[]; total: number; page: number; limit: number }
        const optimisticItem: UserProblemRecord = {
          _id: `optimistic-${Date.now()}`,
          status: variables.status,
          attempts: variables.attempts ?? 1,
          notes: variables.notes ? [variables.notes] : [],
          date: variables.date ?? new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          problemId: {
            _id: variables.problemId,
            title: "Saving...",
            difficulty: "medium",
            topic: "General",
          },
        }

        queryClient.setQueryData(queryKey as QueryKey, {
          ...typed,
          items: [optimisticItem, ...typed.items].slice(0, typed.limit),
          total: typed.total + 1,
        })
      }

      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      if (!context?.snapshots) {
        return
      }

      for (const [queryKey, snapshot] of context.snapshots) {
        queryClient.setQueryData(queryKey as QueryKey, snapshot)
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...dsaQueryKeys.all, "problems"] }),
        queryClient.invalidateQueries({ queryKey: dsaQueryKeys.activity() }),
        queryClient.invalidateQueries({ queryKey: dsaQueryKeys.weakTopics() }),
        queryClient.invalidateQueries({ queryKey: dsaQueryKeys.stats() }),
      ])
    },
  })
}

export function useUpdateDsaProblemLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { status?: DsaProblemStatus; attempts?: number; date?: string; notes?: string } }) =>
      updateUserProblem(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...dsaQueryKeys.all, "problems"] }),
        queryClient.invalidateQueries({ queryKey: dsaQueryKeys.activity() }),
        queryClient.invalidateQueries({ queryKey: dsaQueryKeys.weakTopics() }),
        queryClient.invalidateQueries({ queryKey: dsaQueryKeys.stats() }),
      ])
    },
  })
}

export function useDeleteDsaProblemLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteUserProblem,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...dsaQueryKeys.all, "problems"] }),
        queryClient.invalidateQueries({ queryKey: dsaQueryKeys.activity() }),
        queryClient.invalidateQueries({ queryKey: dsaQueryKeys.weakTopics() }),
        queryClient.invalidateQueries({ queryKey: dsaQueryKeys.stats() }),
      ])
    },
  })
}
