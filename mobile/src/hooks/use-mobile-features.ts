import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addJobApplication,
  compareResumes,
  createApplication,
  createPlannerTask,
  createResume,
  deleteJob,
  deleteResume,
  deleteUserProblem,
  getApplications,
  getDsaActivity,
  getDsaStats,
  getDsaWeakTopics,
  getJobFunnel,
  getJobInsights,
  getJobs,
  getJobStats,
  getPlannerProfiles,
  getPlannerTasksByProfile,
  getProblems,
  getResumeStats,
  getResumes,
  getUserProblems,
  setDefaultResume,
  trackUserProblem,
  updateApplicationStatus,
  updateJobStatus,
  updatePlannerTaskStatus,
  updateUserProblem,
  uploadResume,
} from "@/src/services/api";
import { type DsaProblemStatus, type JobStatus, type PlannerTaskStatus, type TrackUserProblemInput } from "@/src/types/api";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const [dsa, jobs, funnel, resumeStats, weakTopics, activity] = await Promise.allSettled([
        getDsaStats(),
        getJobStats(),
        getJobFunnel(),
        getResumeStats(),
        getDsaWeakTopics(),
        getDsaActivity(),
      ]);

      return {
        dsa: dsa.status === "fulfilled" ? dsa.value : null,
        jobs: jobs.status === "fulfilled" ? jobs.value : null,
        funnel: funnel.status === "fulfilled" ? funnel.value : null,
        resumeStats: resumeStats.status === "fulfilled" ? resumeStats.value : null,
        weakTopics: weakTopics.status === "fulfilled" ? weakTopics.value : null,
        activity: activity.status === "fulfilled" ? activity.value : null,
      };
    },
  });
}

export function useDsaData() {
  const catalog = useQuery({
    queryKey: ["dsa", "catalog"],
    queryFn: () => getProblems({ page: 1, limit: 500 }),
  });

  const logs = useQuery({
    queryKey: ["dsa", "logs"],
    queryFn: () => getUserProblems({ page: 1, limit: 100 }),
  });

  const stats = useQuery({
    queryKey: ["dsa", "stats"],
    queryFn: getDsaStats,
  });

  return { catalog, logs, stats };
}

export function useDsaMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dsa", "logs"] }),
      queryClient.invalidateQueries({ queryKey: ["dsa", "stats"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
    ]);
  };

  return {
    createLog: useMutation({
      mutationFn: (input: TrackUserProblemInput) => trackUserProblem(input),
      onSuccess: () => void invalidate(),
    }),
    updateLog: useMutation({
      mutationFn: ({ id, input }: { id: string; input: { status?: DsaProblemStatus; attempts?: number; date?: string; notes?: string } }) =>
        updateUserProblem(id, input),
      onSuccess: () => void invalidate(),
    }),
    deleteLog: useMutation({
      mutationFn: deleteUserProblem,
      onSuccess: () => void invalidate(),
    }),
  };
}

export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: () => getApplications({ page: 1, limit: 100 }),
  });
}

export function useApplicationMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["applications"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
    ]);
  };

  return {
    create: useMutation({
      mutationFn: createApplication,
      onSuccess: () => void invalidate(),
    }),
    updateStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: "to_apply" | "applied" | "interview" | "rejected" | "offer" }) =>
        updateApplicationStatus(id, status),
      onSuccess: () => void invalidate(),
    }),
  };
}

export function useJobsData() {
  const jobs = useQuery({
    queryKey: ["jobs"],
    queryFn: () => getJobs({ page: 1, limit: 100 }),
  });

  const stats = useQuery({
    queryKey: ["jobs", "stats"],
    queryFn: getJobStats,
  });

  const funnel = useQuery({
    queryKey: ["jobs", "funnel"],
    queryFn: getJobFunnel,
  });

  const insights = useQuery({
    queryKey: ["jobs", "insights"],
    queryFn: getJobInsights,
  });

  return { jobs, stats, funnel, insights };
}

export function useJobsMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["jobs"] }),
      queryClient.invalidateQueries({ queryKey: ["jobs", "stats"] }),
      queryClient.invalidateQueries({ queryKey: ["jobs", "funnel"] }),
      queryClient.invalidateQueries({ queryKey: ["jobs", "insights"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
    ]);
  };

  return {
    create: useMutation({
      mutationFn: addJobApplication,
      onSuccess: () => void invalidate(),
    }),
    updateStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: JobStatus }) => updateJobStatus(id, status),
      onSuccess: () => void invalidate(),
    }),
    delete: useMutation({
      mutationFn: deleteJob,
      onSuccess: () => void invalidate(),
    }),
  };
}

export function usePlannerData(profileId?: string) {
  const profiles = useQuery({
    queryKey: ["planner", "profiles"],
    queryFn: getPlannerProfiles,
  });

  const tasks = useQuery({
    queryKey: ["planner", "tasks", profileId],
    queryFn: () => getPlannerTasksByProfile(profileId ?? "", { page: 1, limit: 100 }),
    enabled: Boolean(profileId),
  });

  return { profiles, tasks };
}

export function usePlannerMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["planner", "profiles"] }),
      queryClient.invalidateQueries({ queryKey: ["planner", "tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
    ]);
  };

  return {
    createTask: useMutation({
      mutationFn: createPlannerTask,
      onSuccess: () => void invalidate(),
    }),
    updateTaskStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: PlannerTaskStatus }) => updatePlannerTaskStatus(id, status),
      onSuccess: () => void invalidate(),
    }),
  };
}

export function useResumeData() {
  const resumes = useQuery({
    queryKey: ["resume", "list"],
    queryFn: getResumes,
  });

  const stats = useQuery({
    queryKey: ["resume", "stats"],
    queryFn: getResumeStats,
  });

  const comparison = useQuery({
    queryKey: ["resume", "comparison"],
    queryFn: compareResumes,
  });

  return { resumes, stats, comparison };
}

export function useResumeMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["resume", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["resume", "stats"] }),
      queryClient.invalidateQueries({ queryKey: ["resume", "comparison"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
    ]);
  };

  return {
    upload: useMutation({
      mutationFn: uploadResume,
      onSuccess: () => void invalidate(),
    }),
    create: useMutation({
      mutationFn: createResume,
      onSuccess: () => void invalidate(),
    }),
    setDefault: useMutation({
      mutationFn: setDefaultResume,
      onSuccess: () => void invalidate(),
    }),
    delete: useMutation({
      mutationFn: deleteResume,
      onSuccess: () => void invalidate(),
    }),
  };
}
