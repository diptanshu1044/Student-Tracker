"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createPlannerProfile,
  createPlannerTask,
  deletePlannerProfile,
  deletePlannerTask,
  getGlobalPlanner,
  getPlannerProfiles,
  getPlannerTasksByProfile,
  importPlannerTasks,
  syncPlannerToGoogle,
  updatePlannerProfile,
  updatePlannerTask,
  updatePlannerTaskStatus,
  type PlannerTaskStatus,
} from "@/lib/api"

export function usePlannerProfiles() {
  return useQuery({
    queryKey: ["plannerProfiles"],
    queryFn: getPlannerProfiles,
  })
}

export function useGlobalPlanner(query?: {
  page?: number
  limit?: number
  priority?: "low" | "medium" | "high"
  status?: PlannerTaskStatus
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ["globalPlanner", query],
    queryFn: () => getGlobalPlanner(query),
  })
}

export function usePlannerTasks(profileId?: string, query?: {
  page?: number
  limit?: number
  priority?: "low" | "medium" | "high"
  status?: PlannerTaskStatus
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ["plannerTasks", profileId, query],
    queryFn: () => getPlannerTasksByProfile(profileId!, query),
    enabled: Boolean(profileId),
  })
}

export function usePlannerMutations() {
  const queryClient = useQueryClient()

  const invalidatePlanner = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["plannerProfiles"] }),
      queryClient.invalidateQueries({ queryKey: ["plannerTasks"] }),
      queryClient.invalidateQueries({ queryKey: ["globalPlanner"] }),
    ])
  }

  const createProfile = useMutation({
    mutationFn: createPlannerProfile,
    onSuccess: () => void invalidatePlanner(),
  })

  const updateProfile = useMutation({
    mutationFn: ({ profileId, input }: { profileId: string; input: { name?: string; description?: string; color?: string } }) =>
      updatePlannerProfile(profileId, input),
    onSuccess: () => void invalidatePlanner(),
  })

  const removeProfile = useMutation({
    mutationFn: deletePlannerProfile,
    onSuccess: () => void invalidatePlanner(),
  })

  const createTask = useMutation({
    mutationFn: createPlannerTask,
    onSuccess: () => void invalidatePlanner(),
  })

  const patchTask = useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: Parameters<typeof updatePlannerTask>[1] }) =>
      updatePlannerTask(taskId, input),
    onSuccess: () => void invalidatePlanner(),
  })

  const patchTaskStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: PlannerTaskStatus }) =>
      updatePlannerTaskStatus(taskId, status),
    onSuccess: () => void invalidatePlanner(),
  })

  const removeTask = useMutation({
    mutationFn: deletePlannerTask,
    onSuccess: () => void invalidatePlanner(),
  })

  const uploadImport = useMutation({
    mutationFn: ({ profileId, file }: { profileId: string; file: File }) =>
      importPlannerTasks(profileId, file),
    onSuccess: () => void invalidatePlanner(),
  })

  const syncGoogle = useMutation({
    mutationFn: syncPlannerToGoogle,
    onSuccess: () => void invalidatePlanner(),
  })

  return {
    createProfile,
    updateProfile,
    removeProfile,
    createTask,
    patchTask,
    patchTaskStatus,
    removeTask,
    uploadImport,
    syncGoogle,
  }
}
