import { StatusCodes } from "http-status-codes";
import { FilterQuery, Types } from "mongoose";
import {
  INTERVIEW_TYPES,
  JOB_PRIORITIES,
  JOB_STATUSES,
  JobApplicationDoc,
  JobApplicationModel,
  JobPriority,
  JobStatus
} from "../../../models/job-application.model";
import { AppError } from "../../../shared/utils/app-error";
import { getPagination } from "../../../shared/utils/pagination";

export interface ListJobsInput {
  userId: string;
  page?: number;
  limit?: number;
  status?: JobStatus;
  company?: string;
  startDate?: string;
  endDate?: string;
  priority?: JobPriority;
  search?: string;
}

export interface CreateJobInput {
  userId: string;
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
  interviewType?: (typeof INTERVIEW_TYPES)[number];
  tags?: string[];
}

export interface UpdateJobInput {
  companyName?: string;
  role?: string;
  jobLink?: string;
  referral?: boolean;
  notes?: string;
  resumeVersion?: string;
  followUpDate?: string | null;
  priority?: JobPriority;
  interviewDate?: string | null;
  interviewType?: (typeof INTERVIEW_TYPES)[number] | null;
  tags?: string[];
}

const STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  applied: ["oa", "rejected"],
  oa: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: [],
  rejected: []
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDate(input?: string | null) {
  if (!input) {
    return undefined;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("Invalid date value provided", StatusCodes.BAD_REQUEST);
  }

  return parsed;
}

function toObjectId(value: string) {
  return new Types.ObjectId(value);
}

export async function addJobApplication(input: CreateJobInput) {
  const now = new Date();
  const userId = toObjectId(input.userId);
  const normalizedCompany = input.companyName.trim();
  const normalizedRole = input.role.trim();
  const status = input.status ?? "applied";

  const duplicate = await JobApplicationModel.findOne({
    userId,
    companyName: { $regex: `^${escapeRegex(normalizedCompany)}$`, $options: "i" },
    role: { $regex: `^${escapeRegex(normalizedRole)}$`, $options: "i" },
    status: { $ne: "rejected" }
  });

  if (duplicate) {
    throw new AppError(
      "A similar active application already exists for this company and role",
      StatusCodes.CONFLICT
    );
  }

  return JobApplicationModel.create({
    userId,
    companyName: normalizedCompany,
    role: normalizedRole,
    status,
    appliedDate: now,
    lastUpdated: now,
    jobLink: input.jobLink,
    referral: input.referral ?? false,
    notes: input.notes,
    resumeVersion: input.resumeVersion,
    followUpDate: parseDate(input.followUpDate),
    priority: input.priority ?? "medium",
    interviewDate: parseDate(input.interviewDate),
    interviewType: input.interviewType,
    tags: input.tags ?? [],
    statusHistory: [{ status, changedAt: now }]
  });
}

export async function listJobApplications(input: ListJobsInput) {
  const paging = getPagination(input);
  const query: FilterQuery<JobApplicationDoc> = { userId: toObjectId(input.userId) };

  if (input.status) {
    query.status = input.status;
  }

  if (input.priority) {
    query.priority = input.priority;
  }

  if (input.company?.trim()) {
    query.companyName = { $regex: escapeRegex(input.company.trim()), $options: "i" };
  }

  if (input.startDate || input.endDate) {
    query.appliedDate = {
      ...(input.startDate ? { $gte: parseDate(input.startDate) } : {}),
      ...(input.endDate ? { $lte: parseDate(input.endDate) } : {})
    };
  }

  if (input.search?.trim()) {
    const searchRegex = { $regex: escapeRegex(input.search.trim()), $options: "i" };
    query.$or = [{ companyName: searchRegex }, { role: searchRegex }];
  }

  const [items, total] = await Promise.all([
    JobApplicationModel.find(query)
      .sort({ lastUpdated: -1, createdAt: -1 })
      .skip(paging.skip)
      .limit(paging.limit),
    JobApplicationModel.countDocuments(query)
  ]);

  return {
    items,
    total,
    page: paging.page,
    limit: paging.limit
  };
}

export async function updateJobApplicationStatus(userId: string, jobId: string, nextStatus: JobStatus) {
  const document = await JobApplicationModel.findOne({ _id: toObjectId(jobId), userId: toObjectId(userId) });

  if (!document) {
    throw new AppError("Application not found", StatusCodes.NOT_FOUND);
  }

  if (document.status === nextStatus) {
    return document;
  }

  const allowedNext = STATUS_TRANSITIONS[document.status] ?? [];
  if (!allowedNext.includes(nextStatus)) {
    throw new AppError(
      `Invalid status transition from ${document.status} to ${nextStatus}`,
      StatusCodes.BAD_REQUEST
    );
  }

  const now = new Date();
  document.status = nextStatus;
  document.lastUpdated = now;
  document.statusHistory.push({ status: nextStatus, changedAt: now });
  await document.save();

  return document;
}

export async function updateJobApplication(userId: string, jobId: string, input: UpdateJobInput) {
  const patch: Record<string, unknown> = {
    ...("companyName" in input ? { companyName: input.companyName?.trim() } : {}),
    ...("role" in input ? { role: input.role?.trim() } : {}),
    ...("jobLink" in input ? { jobLink: input.jobLink } : {}),
    ...("referral" in input ? { referral: input.referral } : {}),
    ...("notes" in input ? { notes: input.notes } : {}),
    ...("resumeVersion" in input ? { resumeVersion: input.resumeVersion } : {}),
    ...("priority" in input ? { priority: input.priority } : {}),
    ...("tags" in input ? { tags: input.tags ?? [] } : {})
  };

  if ("followUpDate" in input) {
    patch.followUpDate = parseDate(input.followUpDate ?? undefined);
    patch.followUpNotified = false;
  }

  if ("interviewDate" in input) {
    patch.interviewDate = parseDate(input.interviewDate ?? undefined);
    patch.interviewNotified = false;
  }

  if ("interviewType" in input) {
    patch.interviewType = input.interviewType ?? undefined;
  }

  patch.lastUpdated = new Date();

  const updated = await JobApplicationModel.findOneAndUpdate(
    { _id: toObjectId(jobId), userId: toObjectId(userId) },
    { $set: patch },
    { new: true }
  );

  if (!updated) {
    throw new AppError("Application not found", StatusCodes.NOT_FOUND);
  }

  return updated;
}

export async function deleteJobApplication(userId: string, jobId: string) {
  const deleted = await JobApplicationModel.findOneAndDelete({
    _id: toObjectId(jobId),
    userId: toObjectId(userId)
  });

  if (!deleted) {
    throw new AppError("Application not found", StatusCodes.NOT_FOUND);
  }

  return { deleted: true as const };
}

export function getJobsMetadata() {
  return {
    statuses: JOB_STATUSES,
    priorities: JOB_PRIORITIES,
    interviewTypes: INTERVIEW_TYPES
  };
}
