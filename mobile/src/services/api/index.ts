import { isAxiosError } from "axios";

import { api } from "@/src/services/api/client";
import { dashboardSources, moduleEndpoints } from "@/src/services/api/endpoints";
import {
  type ApplicationRecord,
  type ApiEnvelope,
  type AuthPayload,
  type AuthTokens,
  type AuthUser,
  type DsaActivityPoint,
  type DsaProblemStatus,
  type DsaStats,
  type DsaWeakTopicPoint,
  type InterviewType,
  type JobApplicationRecord,
  type JobFunnel,
  type JobInsights,
  type JobPriority,
  type JobStats,
  type JobStatus,
  type PaginatedResponse,
  type PlannerImportResult,
  type PlannerProfileRecord,
  type PlannerTaskRecord,
  type PlannerTaskStatus,
  type ProblemRecord,
  type ResumeCompareRecord,
  type ResumeRecord,
  type ResumeStatRecord,
  type StreakData,
  type TaskRecord,
  type TopicBreakdownPoint,
  type TrackUserProblemInput,
  type UnknownRecord,
  type UserProblemRecord,
  type WeakTopicPoint,
  type WeeklySolvedPoint,
} from "@/src/types/api";

function normalizeResponse<T>(payload: ApiEnvelope<T>): T {
  if (!payload.success || payload.data === null) {
    throw new Error(payload.error ?? "Unexpected API response");
  }

  return payload.data;
}

export function getApiErrorMessage(error: unknown) {
  if (isAxiosError<ApiEnvelope<unknown>>(error)) {
    return error.response?.data?.error ?? error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong";
}

function withQuery(path: string, query?: Record<string, string | number | boolean | undefined>) {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export async function login(input: { email: string; password: string }) {
  const response = await api.post<ApiEnvelope<AuthPayload>>("/auth/login", input);
  return normalizeResponse(response.data);
}

export async function register(input: { name: string; email: string; password: string }) {
  const response = await api.post<ApiEnvelope<AuthPayload>>("/auth/register", input);
  return normalizeResponse(response.data);
}

export async function getMe() {
  const response = await api.get<ApiEnvelope<AuthUser>>("/auth/me");
  return normalizeResponse(response.data);
}

export async function refreshAccessToken(input: { refreshToken: string }) {
  const response = await api.post<ApiEnvelope<AuthTokens>>("/auth/refresh", input);
  return normalizeResponse(response.data);
}

export async function resendVerificationEmail() {
  const response = await api.post<ApiEnvelope<{ sent: boolean; reason?: "already_verified" }>>(
    "/auth/resend-verification",
  );
  return normalizeResponse(response.data);
}

export async function getStreak() {
  const response = await api.get<ApiEnvelope<StreakData>>("/analytics/streak");
  return normalizeResponse(response.data);
}

export async function getWeeklySolved() {
  const response = await api.get<ApiEnvelope<WeeklySolvedPoint[]>>("/analytics/weekly-solved");
  return normalizeResponse(response.data);
}

export async function getTopicBreakdown() {
  const response = await api.get<ApiEnvelope<TopicBreakdownPoint[]>>("/analytics/topic-breakdown");
  return normalizeResponse(response.data);
}

export async function getTasks(query?: { page?: number; limit?: number }) {
  const response = await api.get<ApiEnvelope<PaginatedResponse<TaskRecord>>>(
    withQuery("/planner/tasks", query),
  );
  return normalizeResponse(response.data);
}

export async function getWeakTopics() {
  const response = await api.get<ApiEnvelope<WeakTopicPoint[]>>("/analytics/weak-topics");
  return normalizeResponse(response.data);
}

export async function getProblems(query?: { page?: number; limit?: number }) {
  const response = await api.get<ApiEnvelope<PaginatedResponse<ProblemRecord>>>(
    withQuery("/dsa/catalog", query),
  );
  return normalizeResponse(response.data);
}

export async function getProblemCatalog(query?: { page?: number; limit?: number }) {
  return getProblems(query);
}

export async function getUserProblems(query?: {
  page?: number;
  limit?: number;
  difficulty?: "easy" | "medium" | "hard";
  topic?: string;
  status?: DsaProblemStatus;
  search?: string;
}) {
  const response = await api.get<ApiEnvelope<PaginatedResponse<UserProblemRecord>>>(
    withQuery("/dsa/problems", query),
  );
  return normalizeResponse(response.data);
}

export async function trackUserProblem(input: TrackUserProblemInput) {
  const response = await api.post<ApiEnvelope<UserProblemRecord>>("/dsa/problems", input);
  return normalizeResponse(response.data);
}

export async function updateUserProblem(
  id: string,
  input: { status?: DsaProblemStatus; attempts?: number; date?: string; notes?: string },
) {
  const response = await api.put<ApiEnvelope<UserProblemRecord>>(`/dsa/${id}`, input);
  return normalizeResponse(response.data);
}

export async function deleteUserProblem(id: string) {
  const response = await api.delete<ApiEnvelope<{ deleted: true }>>(`/dsa/${id}`);
  return normalizeResponse(response.data);
}

export async function getDsaActivity() {
  const response = await api.get<ApiEnvelope<DsaActivityPoint[]>>("/dsa/activity");
  return normalizeResponse(response.data);
}

export async function getDsaWeakTopics() {
  const response = await api.get<ApiEnvelope<DsaWeakTopicPoint[]>>("/dsa/weak-topics");
  return normalizeResponse(response.data);
}

export async function getDsaStats() {
  const response = await api.get<ApiEnvelope<DsaStats>>("/dsa/stats");
  return normalizeResponse(response.data);
}

export async function getPlannerProfiles() {
  const response = await api.get<ApiEnvelope<PlannerProfileRecord[]>>("/planner/profiles");
  return normalizeResponse(response.data);
}

export async function createPlannerProfile(input: {
  name: string;
  description?: string;
  color?: string;
}) {
  const response = await api.post<ApiEnvelope<PlannerProfileRecord>>("/planner/profiles", input);
  return normalizeResponse(response.data);
}

export async function updatePlannerProfile(
  profileId: string,
  input: { name?: string; description?: string; color?: string },
) {
  const response = await api.patch<ApiEnvelope<PlannerProfileRecord>>(
    `/planner/profiles/${profileId}`,
    input,
  );
  return normalizeResponse(response.data);
}

export async function deletePlannerProfile(profileId: string) {
  const response = await api.delete<ApiEnvelope<{ deleted: true }>>(
    `/planner/profiles/${profileId}`,
  );
  return normalizeResponse(response.data);
}

export async function getGlobalPlanner(query?: {
  page?: number;
  limit?: number;
  priority?: "low" | "medium" | "high";
  status?: PlannerTaskStatus;
  startDate?: string;
  endDate?: string;
}) {
  const response = await api.get<ApiEnvelope<PaginatedResponse<PlannerTaskRecord>>>(
    withQuery("/planner/all", query),
  );
  return normalizeResponse(response.data);
}

export async function getPlannerTasksByProfile(
  profileId: string,
  query?: {
    page?: number;
    limit?: number;
    priority?: "low" | "medium" | "high";
    status?: PlannerTaskStatus;
    startDate?: string;
    endDate?: string;
  },
) {
  const response = await api.get<ApiEnvelope<PaginatedResponse<PlannerTaskRecord>>>(
    withQuery(`/planner/profile/${profileId}`, query),
  );
  return normalizeResponse(response.data);
}

export async function createPlannerTask(input: {
  profileId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  priority: "low" | "medium" | "high";
  reminderTime?: string;
}) {
  const response = await api.post<ApiEnvelope<PlannerTaskRecord>>("/planner/tasks-v2", input);
  return normalizeResponse(response.data);
}

export async function updatePlannerTask(
  taskId: string,
  input: Partial<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    priority: "low" | "medium" | "high";
    status: PlannerTaskStatus;
    reminderTime: string;
  }>,
) {
  const response = await api.patch<ApiEnvelope<PlannerTaskRecord>>(`/planner/tasks-v2/${taskId}`, input);
  return normalizeResponse(response.data);
}

export async function deletePlannerTask(taskId: string) {
  const response = await api.delete<ApiEnvelope<{ deleted: true }>>(`/planner/tasks-v2/${taskId}`);
  return normalizeResponse(response.data);
}

export async function updatePlannerTaskStatus(taskId: string, status: PlannerTaskStatus) {
  const response = await api.patch<ApiEnvelope<PlannerTaskRecord>>(`/planner/tasks-v2/${taskId}/status`, {
    status,
  });
  return normalizeResponse(response.data);
}

export async function importPlannerTasks(input: {
  profileId: string;
  fileUri: string;
  fileName: string;
  mimeType?: string;
}) {
  const formData = new FormData();
  formData.append("profileId", input.profileId);
  formData.append("file", {
    uri: input.fileUri,
    name: input.fileName,
    type: input.mimeType ?? "application/octet-stream",
  } as never);

  const response = await api.post<ApiEnvelope<PlannerImportResult>>("/planner/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return normalizeResponse(response.data);
}

export async function syncPlannerToGoogle(profileId?: string) {
  const response = await api.post<ApiEnvelope<{ total: number; syncedCount: number }>>(
    "/planner/google/sync",
    { profileId },
  );
  return normalizeResponse(response.data);
}

export async function getApplications(query?: {
  page?: number;
  limit?: number;
  status?: "to_apply" | "applied" | "interview" | "rejected" | "offer";
}) {
  const response = await api.get<ApiEnvelope<PaginatedResponse<ApplicationRecord>>>(
    withQuery("/applications", query),
  );
  return normalizeResponse(response.data);
}

export async function createApplication(input: {
  company: string;
  role: string;
  status?: "to_apply" | "applied" | "interview" | "rejected" | "offer";
  appliedDate?: string;
  lastDateToApply?: string;
  notes?: string[];
}) {
  const response = await api.post<ApiEnvelope<ApplicationRecord>>("/applications", input);
  return normalizeResponse(response.data);
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "to_apply" | "applied" | "interview" | "rejected" | "offer",
) {
  const response = await api.patch<ApiEnvelope<ApplicationRecord>>(
    `/applications/${applicationId}/status`,
    { status },
  );
  return normalizeResponse(response.data);
}

export async function getJobs(query?: {
  page?: number;
  limit?: number;
  status?: JobStatus;
  company?: string;
  startDate?: string;
  endDate?: string;
  priority?: JobPriority;
  search?: string;
}) {
  const response = await api.get<ApiEnvelope<PaginatedResponse<JobApplicationRecord>>>(
    withQuery("/jobs", query),
  );
  return normalizeResponse(response.data);
}

export async function addJobApplication(input: {
  resumeId?: string;
  companyName: string;
  role: string;
  status?: JobStatus;
  jobLink?: string;
  referral?: boolean;
  notes?: string;
  resumeVersion?: string;
  followUpDate?: string;
  priority?: JobPriority;
  interviewDate?: string;
  interviewType?: InterviewType;
  tags?: string[];
}) {
  const response = await api.post<ApiEnvelope<JobApplicationRecord>>("/jobs/add", input);
  return normalizeResponse(response.data);
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const response = await api.put<ApiEnvelope<JobApplicationRecord>>(`/jobs/${jobId}/status`, { status });
  return normalizeResponse(response.data);
}

export async function updateJob(
  jobId: string,
  input: Partial<{
    resumeId: string | null;
    companyName: string;
    role: string;
    jobLink: string;
    referral: boolean;
    notes: string;
    resumeVersion: string;
    followUpDate: string | null;
    priority: JobPriority;
    interviewDate: string | null;
    interviewType: InterviewType | null;
    tags: string[];
  }>,
) {
  const response = await api.put<ApiEnvelope<JobApplicationRecord>>(`/jobs/${jobId}`, input);
  return normalizeResponse(response.data);
}

export async function deleteJob(jobId: string) {
  const response = await api.delete<ApiEnvelope<{ deleted: true }>>(`/jobs/${jobId}`);
  return normalizeResponse(response.data);
}

export async function getJobStats() {
  const response = await api.get<ApiEnvelope<JobStats>>("/jobs/stats");
  return normalizeResponse(response.data);
}

export async function getJobFunnel() {
  const response = await api.get<ApiEnvelope<JobFunnel>>("/jobs/funnel");
  return normalizeResponse(response.data);
}

export async function getJobInsights() {
  const response = await api.get<ApiEnvelope<JobInsights>>("/jobs/insights");
  return normalizeResponse(response.data);
}

export async function getResumes(query?: { tags?: string[]; sort?: "latest" | "most_used" }) {
  const response = await api.get<ApiEnvelope<ResumeRecord[]>>(
    withQuery("/resume", {
      tags: query?.tags?.length ? query.tags.join(",") : undefined,
      sort: query?.sort,
    }),
  );
  return normalizeResponse(response.data);
}

export async function getResumeById(resumeId: string) {
  const response = await api.get<ApiEnvelope<ResumeRecord>>(`/resume/${resumeId}`);
  return normalizeResponse(response.data);
}

export async function getResumeFileUrl(resumeId: string) {
  const response = await api.get<ApiEnvelope<{ url: string }>>(`/resume/${resumeId}/file-url`);
  return normalizeResponse(response.data);
}

export async function createResume(input: {
  name: string;
  content?: Record<string, unknown> | string;
  fileUrl?: string;
  tags?: string[];
}) {
  const response = await api.post<ApiEnvelope<ResumeRecord>>("/resume", input);
  return normalizeResponse(response.data);
}

export async function uploadResume(input: {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  tags?: string[];
}) {
  const formData = new FormData();
  formData.append("name", input.fileName);
  formData.append("file", {
    uri: input.fileUri,
    name: input.fileName,
    type: input.mimeType ?? "application/octet-stream",
  } as never);

  if (input.tags?.length) {
    formData.append("tags", input.tags.join(","));
  }

  const response = await api.post<ApiEnvelope<ResumeRecord>>("/resume/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return normalizeResponse(response.data);
}

export async function setDefaultResume(resumeId: string) {
  const response = await api.put<ApiEnvelope<ResumeRecord>>(`/resume/${resumeId}/default`);
  return normalizeResponse(response.data);
}

export async function deleteResume(resumeId: string) {
  const response = await api.delete<ApiEnvelope<{ deleted: true }>>(`/resume/${resumeId}`);
  return normalizeResponse(response.data);
}

export async function getResumeStats() {
  const response = await api.get<ApiEnvelope<ResumeStatRecord[]>>("/resume/stats");
  return normalizeResponse(response.data);
}

export async function compareResumes() {
  const response = await api.get<ApiEnvelope<ResumeCompareRecord[]>>("/resume/compare");
  return normalizeResponse(response.data);
}

export async function getDashboardData() {
  const results = await Promise.allSettled(
    dashboardSources.map(async (source) => {
      const response = await api.get<ApiEnvelope<UnknownRecord>>(source);
      return {
        source,
        data: normalizeResponse(response.data),
      };
    }),
  );

  return results.reduce<Record<string, UnknownRecord>>((acc, result) => {
    if (result.status === "fulfilled") {
      acc[result.value.source] = result.value.data;
    }

    return acc;
  }, {});
}

export async function getModuleList(
  moduleName: keyof typeof moduleEndpoints,
  query?: Record<string, string | number>,
) {
  const endpoint = moduleEndpoints[moduleName];
  const response = await api.get<ApiEnvelope<PaginatedResponse<UnknownRecord> | UnknownRecord[]>>(
    endpoint,
    { params: query },
  );

  const raw = normalizeResponse(response.data);
  if (Array.isArray(raw)) {
    return raw;
  }

  if ("items" in raw && Array.isArray(raw.items)) {
    return raw.items;
  }

  return [];
}

export async function getRecordById(modulePath: string, id: string) {
  const response = await api.get<ApiEnvelope<UnknownRecord>>(`${modulePath}/${id}`);
  return normalizeResponse(response.data);
}
