export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface StreakData {
  currentStreak: number
  lastActiveDate: string | null
}

export type DsaProblemStatus = "solved" | "attempted" | "revision" | "revise"

export interface WeeklySolvedPoint {
  year: number
  week: number
  solvedCount: number
}

export interface TopicBreakdownPoint {
  topic: string
  solvedCount: number
}

export interface WeakTopicPoint {
  topic: string
  weaknessScore: number
  reviseCount: number
  solvedCount: number
}

export interface DsaWeakTopicPoint {
  topic: string
  totalAttempts: number
  totalSolved: number
  totalProblems: number
  solveRate: number
  avgAttempts: number
  score: number
}

export interface DsaActivityPoint {
  date: string
  count: number
}

export interface DsaStats {
  totalSolved: number
  totalAttempted: number
  totalProblems: number
  currentStreak: number
  longestStreak: number
}

export interface ProblemRecord {
  _id: string
  title?: string
  difficulty?: "easy" | "medium" | "hard"
  topic?: string
  platform?: "leetcode" | "gfg"
}

export interface UserProblemRecord {
  _id: string
  status: DsaProblemStatus
  attempts: number
  notes?: string[]
  date?: string
  createdAt: string
  updatedAt: string
  problemId: ProblemRecord
}

export interface CreateProblemInput {
  title: string
  platform: "leetcode" | "gfg"
  difficulty: "easy" | "medium" | "hard"
  topic: string
}

export type TrackUserProblemInput =
  | {
      problemId: string
      createProblem?: never
      status: DsaProblemStatus
      attempts?: number
      date?: string
      notes?: string
    }
  | {
      problemId?: never
      createProblem: CreateProblemInput
      status: DsaProblemStatus
      attempts?: number
      date?: string
      notes?: string
    }

export interface TaskRecord {
  _id: string
  title: string
  type: "dsa" | "job" | "study"
  priority: "low" | "medium" | "high"
  dueDate?: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface PlannerProfileRecord {
  _id: string
  name: string
  description?: string
  color: string
  createdAt: string
  updatedAt: string
}

export type PlannerTaskStatus = "pending" | "completed" | "missed"

export interface PlannerTaskRecord {
  _id: string
  profileId:
    | string
    | {
        _id: string
        name: string
        color: string
      }
  title: string
  description?: string
  startTime: string
  endTime: string
  priority: "low" | "medium" | "high"
  status: PlannerTaskStatus
  reminderTime?: string
  source: "manual" | "csv" | "json" | "excel" | "google"
  createdAt: string
  updatedAt: string
}

export interface PlannerImportResult {
  successCount: number
  failedRows: Array<{
    rowNumber: number
    error: string
  }>
}

export interface ApplicationRecord {
  _id: string
  company: string
  role: string
  status: "applied" | "interview" | "rejected" | "offer"
  appliedDate?: string
  notes: string[]
  createdAt: string
  updatedAt: string
}

export interface ResumeRecord {
  _id: string
  name: string
  content: Record<string, unknown> | string
  tags: string[]
  version: number
  createdAt: string
  updatedAt: string
}

interface RequestOptions extends RequestInit {
  auth?: boolean
  skipAuthRefresh?: boolean
}

export interface AuthUser {
  id: string
  name: string
  email: string
  emailVerified?: boolean
  googleCalendarConnected?: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthPayload {
  user: AuthUser
  tokens: AuthTokens
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8080/api/v1"

const ACCESS_TOKEN_STORAGE_KEY = "studentos_access_token"
const REFRESH_TOKEN_STORAGE_KEY = "studentos_refresh_token"
const AUTH_USER_STORAGE_KEY = "studentos_auth_user"
const AUTH_COOKIE_NAME = "studentos_logged_in"

function setSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
  }
}

function clearSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`
  }
}

function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  }

  return process.env.NEXT_PUBLIC_ACCESS_TOKEN ?? null
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

function forceLogout() {
  clearAuthTokens()

  if (typeof window !== "undefined") {
    window.location.assign("/login")
  }
}

let refreshInFlight: Promise<string | null> | null = null

async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      return null
    }

    try {
      const tokens = await apiRequest<AuthTokens>("/auth/refresh", {
        method: "POST",
        auth: false,
        skipAuthRefresh: true,
        body: JSON.stringify({ refreshToken }),
      })

      setAuthTokens(tokens)
      return tokens.accessToken
    } catch {
      clearAuthTokens()
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export function setAuthTokens(tokens: AuthTokens) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, tokens.accessToken)
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken)
    setSessionCookie()
  }
}

export function clearAuthTokens() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    clearSessionCookie()
  }
}

export function hasAccessToken() {
  return Boolean(getAccessToken())
}

export function setAuthSession(payload: AuthPayload) {
  setAuthTokens(payload.tokens)

  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(payload.user))
  }
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setAuthUser(user: AuthUser) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
  }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, skipAuthRefresh = false, headers, ...rest } = options
  let token = getAccessToken()

  if (auth && !token && !skipAuthRefresh) {
    token = await tryRefreshAccessToken()
  }

  if (auth && !token) {
    forceLogout()
    throw new Error(
      "Missing access token. Set localStorage key 'studentos_access_token' or NEXT_PUBLIC_ACCESS_TOKEN."
    )
  }

  const hasFormDataBody =
    typeof FormData !== "undefined" && rest.body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(hasFormDataBody ? {} : { "Content-Type": "application/json" }),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  })

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await response.json()) as ApiEnvelope<T>
  } catch {
    payload = null
  }

  if (auth && response.status === 401 && !skipAuthRefresh) {
    const refreshedToken = await tryRefreshAccessToken()

    if (refreshedToken) {
      return apiRequest<T>(path, {
        ...options,
        skipAuthRefresh: true,
      })
    }
  }

  if (auth && response.status === 401) {
    forceLogout()
  }

  if (!response.ok || !payload?.success || payload.data === null) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`)
  }

  return payload.data
}

function withQuery(path: string, query?: Record<string, string | number | boolean | undefined>) {
  if (!query) {
    return path
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value))
    }
  }

  const suffix = params.toString()
  return suffix ? `${path}?${suffix}` : path
}

export async function getStreak() {
  return apiRequest<StreakData>("/analytics/streak")
}

export async function login(input: { email: string; password: string }) {
  return apiRequest<AuthPayload>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  })
}

export async function register(input: { name: string; email: string; password: string }) {
  return apiRequest<AuthPayload>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  })
}

export async function refreshAccessToken(input: { refreshToken: string }) {
  return apiRequest<AuthTokens>("/auth/refresh", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  })
}

export async function getMe() {
  return apiRequest<AuthUser>("/auth/me")
}

export async function resendVerificationEmail() {
  return apiRequest<{ sent: boolean; reason?: "already_verified" }>("/auth/resend-verification", {
    method: "POST",
  })
}

export async function getProblems(query?: {
  page?: number
  limit?: number
}) {
  return apiRequest<PaginatedResponse<ProblemRecord>>(withQuery("/dsa/catalog", query), {
    auth: false,
  })
}

export async function getProblemCatalog(query?: {
  page?: number
  limit?: number
}) {
  return getProblems(query)
}

export async function getWeeklySolved() {
  return apiRequest<WeeklySolvedPoint[]>("/analytics/weekly-solved")
}

export async function getTopicBreakdown() {
  return apiRequest<TopicBreakdownPoint[]>("/analytics/topic-breakdown")
}

export async function getWeakTopics() {
  return apiRequest<WeakTopicPoint[]>("/analytics/weak-topics")
}

export async function getUserProblems(query?: {
  page?: number
  limit?: number
  difficulty?: "easy" | "medium" | "hard"
  topic?: string
  status?: DsaProblemStatus
  search?: string
}) {
  return apiRequest<PaginatedResponse<UserProblemRecord>>(withQuery("/dsa/problems", query))
}

export async function trackUserProblem(input: TrackUserProblemInput) {
  return apiRequest<UserProblemRecord>("/dsa/problems", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateUserProblem(
  id: string,
  input: {
    status?: DsaProblemStatus
    attempts?: number
    date?: string
    notes?: string
  }
) {
  return apiRequest<UserProblemRecord>(`/dsa/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export async function deleteUserProblem(id: string) {
  return apiRequest<{ deleted: true }>(`/dsa/${id}`, {
    method: "DELETE",
  })
}

export async function getDsaActivity() {
  return apiRequest<DsaActivityPoint[]>("/dsa/activity")
}

export async function getDsaWeakTopics() {
  return apiRequest<DsaWeakTopicPoint[]>("/dsa/weak-topics")
}

export async function getDsaStats() {
  return apiRequest<DsaStats>("/dsa/stats")
}

export async function getTasks(query?: {
  page?: number
  limit?: number
  completed?: boolean
}) {
  return apiRequest<PaginatedResponse<TaskRecord>>(withQuery("/planner/tasks", query))
}

export async function createTask(input: {
  title: string
  type: "dsa" | "job" | "study"
  priority: "low" | "medium" | "high"
  dueDate?: string
}) {
  return apiRequest<TaskRecord>("/planner/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateTaskCompletion(taskId: string, completed: boolean) {
  return apiRequest<TaskRecord>(`/planner/tasks/${taskId}/completed`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  })
}

export async function getPlannerProfiles() {
  return apiRequest<PlannerProfileRecord[]>("/planner/profiles")
}

export async function createPlannerProfile(input: {
  name: string
  description?: string
  color?: string
}) {
  return apiRequest<PlannerProfileRecord>("/planner/profiles", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updatePlannerProfile(
  profileId: string,
  input: {
    name?: string
    description?: string
    color?: string
  }
) {
  return apiRequest<PlannerProfileRecord>(`/planner/profiles/${profileId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function deletePlannerProfile(profileId: string) {
  return apiRequest<{ deleted: true }>(`/planner/profiles/${profileId}`, {
    method: "DELETE",
  })
}

export async function getGlobalPlanner(query?: {
  page?: number
  limit?: number
  priority?: "low" | "medium" | "high"
  status?: PlannerTaskStatus
  startDate?: string
  endDate?: string
}) {
  return apiRequest<PaginatedResponse<PlannerTaskRecord>>(withQuery("/planner/all", query))
}

export async function getPlannerTasksByProfile(
  profileId: string,
  query?: {
    page?: number
    limit?: number
    priority?: "low" | "medium" | "high"
    status?: PlannerTaskStatus
    startDate?: string
    endDate?: string
  }
) {
  return apiRequest<PaginatedResponse<PlannerTaskRecord>>(
    withQuery(`/planner/profile/${profileId}`, query)
  )
}

export async function createPlannerTask(input: {
  profileId: string
  title: string
  description?: string
  startTime: string
  endTime: string
  priority: "low" | "medium" | "high"
  reminderTime?: string
}) {
  return apiRequest<PlannerTaskRecord>("/planner/tasks-v2", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updatePlannerTask(
  taskId: string,
  input: Partial<{
    title: string
    description: string
    startTime: string
    endTime: string
    priority: "low" | "medium" | "high"
    status: PlannerTaskStatus
    reminderTime: string
  }>
) {
  return apiRequest<PlannerTaskRecord>(`/planner/tasks-v2/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function deletePlannerTask(taskId: string) {
  return apiRequest<{ deleted: true }>(`/planner/tasks-v2/${taskId}`, {
    method: "DELETE",
  })
}

export async function updatePlannerTaskStatus(taskId: string, status: PlannerTaskStatus) {
  return apiRequest<PlannerTaskRecord>(`/planner/tasks-v2/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export async function importPlannerTasks(profileId: string, file: File) {
  const form = new FormData()
  form.append("profileId", profileId)
  form.append("file", file)

  return apiRequest<PlannerImportResult>("/planner/import", {
    method: "POST",
    body: form,
  })
}

export async function getGooglePlannerConnectUrl() {
  return apiRequest<{ url: string }>("/planner/google/connect")
}

export async function disconnectGooglePlanner() {
  return apiRequest<{ disconnected: true }>("/planner/google/disconnect", {
    method: "POST",
  })
}

export async function syncPlannerToGoogle(profileId?: string) {
  return apiRequest<{ total: number; syncedCount: number }>("/planner/google/sync", {
    method: "POST",
    body: JSON.stringify({ profileId }),
  })
}

export async function getApplications(query?: {
  page?: number
  limit?: number
  status?: "applied" | "interview" | "rejected" | "offer"
}) {
  return apiRequest<PaginatedResponse<ApplicationRecord>>(withQuery("/applications", query))
}

export async function createApplication(input: {
  company: string
  role: string
  status?: "applied" | "interview" | "rejected" | "offer"
  appliedDate?: string
  notes?: string[]
}) {
  return apiRequest<ApplicationRecord>("/applications", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "applied" | "interview" | "rejected" | "offer"
) {
  return apiRequest<ApplicationRecord>(`/applications/${applicationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export async function getResumes() {
  return apiRequest<ResumeRecord[]>("/resume")
}

export async function createResume(input: {
  name: string
  content: Record<string, unknown> | string
  tags?: string[]
}) {
  return apiRequest<ResumeRecord>("/resume", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
