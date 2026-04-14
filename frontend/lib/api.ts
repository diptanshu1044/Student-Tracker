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
}

export interface AuthUser {
  id: string
  name: string
  email: string
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

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options
  const token = getAccessToken()

  if (auth && !token) {
    throw new Error(
      "Missing access token. Set localStorage key 'studentos_access_token' or NEXT_PUBLIC_ACCESS_TOKEN."
    )
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  })

  const payload = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !payload.success || payload.data === null) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`)
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
