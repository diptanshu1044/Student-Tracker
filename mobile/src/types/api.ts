export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  googleCalendarConnected?: boolean;
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface StreakData {
  currentStreak: number;
  lastActiveDate: string | null;
}

export type DsaProblemStatus = "solved" | "attempted" | "revision" | "revise";

export interface WeeklySolvedPoint {
  year: number;
  week: number;
  solvedCount: number;
}

export interface TopicBreakdownPoint {
  topic: string;
  solvedCount: number;
}

export interface WeakTopicPoint {
  topic: string;
  weaknessScore: number;
  reviseCount: number;
  solvedCount: number;
}

export interface DsaWeakTopicPoint {
  topic: string;
  totalAttempts: number;
  totalSolved: number;
  totalProblems: number;
  solveRate: number;
  avgAttempts: number;
  score: number;
}

export interface DsaActivityPoint {
  date: string;
  count: number;
}

export interface DsaStats {
  totalSolved: number;
  totalAttempted: number;
  totalProblems: number;
  currentStreak: number;
  longestStreak: number;
}

export interface ProblemRecord {
  _id: string;
  title?: string;
  difficulty?: "easy" | "medium" | "hard";
  topic?: string;
  platform?: "leetcode" | "gfg";
}

export interface UserProblemRecord {
  _id: string;
  status: DsaProblemStatus;
  attempts: number;
  notes?: string[];
  date?: string;
  createdAt: string;
  updatedAt: string;
  problemId: ProblemRecord;
}

export interface CreateProblemInput {
  title: string;
  platform: "leetcode" | "gfg";
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

export type TrackUserProblemInput =
  | {
      problemId: string;
      createProblem?: never;
      status: DsaProblemStatus;
      attempts?: number;
      date?: string;
      notes?: string;
    }
  | {
      problemId?: never;
      createProblem: CreateProblemInput;
      status: DsaProblemStatus;
      attempts?: number;
      date?: string;
      notes?: string;
    };

export type PlannerTaskStatus = "pending" | "completed" | "missed";

export interface PlannerProfileRecord {
  _id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerTaskRecord {
  _id: string;
  profileId:
    | string
    | {
        _id: string;
        name: string;
        color: string;
      };
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  priority: "low" | "medium" | "high";
  status: PlannerTaskStatus;
  reminderTime?: string;
  source: "manual" | "csv" | "json" | "excel" | "google";
  createdAt: string;
  updatedAt: string;
}

export interface PlannerImportResult {
  successCount: number;
  failedRows: {
    rowNumber: number;
    error: string;
  }[];
}

export interface ApplicationRecord {
  _id: string;
  company: string;
  role: string;
  status: "to_apply" | "applied" | "interview" | "rejected" | "offer";
  appliedDate?: string;
  lastDateToApply?: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = "applied" | "oa" | "interview" | "rejected" | "offer";
export type JobPriority = "low" | "medium" | "high";
export type InterviewType = "hr" | "technical" | "system-design";

export interface JobStatusHistoryPoint {
  status: JobStatus;
  changedAt: string;
}

export interface JobApplicationRecord {
  _id: string;
  resumeId?: string;
  companyName: string;
  role: string;
  status: JobStatus;
  appliedDate: string;
  lastUpdated: string;
  jobLink?: string;
  referral: boolean;
  notes?: string;
  resumeVersion?: string;
  followUpDate?: string;
  priority: JobPriority;
  interviewDate?: string;
  interviewType?: InterviewType;
  tags: string[];
  statusHistory: JobStatusHistoryPoint[];
  createdAt: string;
  updatedAt: string;
}

export interface JobStats {
  totalApplications: number;
  interviews: number;
  offers: number;
  rejections: number;
  successRate: number;
  responseRate: number;
}

export interface JobFunnel {
  applied: number;
  oa: number;
  interview: number;
  offer: number;
  rejected: number;
}

export interface JobInsights {
  insights: string[];
  metrics: {
    referralResponseRate: number;
    nonReferralResponseRate: number;
    rejectedAfterOaCount: number;
    totalRejected: number;
  };
}

export interface ResumeRecord {
  _id: string;
  name: string;
  content?: Record<string, unknown> | string;
  fileUrl?: string;
  fileType?: "pdf" | "docx";
  tags: string[];
  version: number;
  isDefault: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeStatRecord {
  resumeId: string;
  name: string;
  totalUsed: number;
  interviews: number;
  offers: number;
  successRate: number;
}

export interface ResumeCompareRecord {
  resumeId: string;
  name: string;
  totalUsed: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
}

export type UnknownRecord = Record<string, unknown>;
