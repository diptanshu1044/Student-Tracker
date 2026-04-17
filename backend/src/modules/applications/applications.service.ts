import { Types } from "mongoose";
import { ApplicationModel } from "../../models/application.model";
import { getPagination } from "../../shared/utils/pagination";

interface ListApplicationsInput {
  userId: string;
  page?: number;
  limit?: number;
  status?: "to_apply" | "applied" | "interview" | "rejected" | "offer";
}

interface CreateApplicationInput {
  userId: string;
  company: string;
  role: string;
  status?: "to_apply" | "applied" | "interview" | "rejected" | "offer";
  appliedDate?: string;
  lastDateToApply?: string;
  notes?: string[];
}

type ApplicationStatus = "to_apply" | "applied" | "interview" | "rejected" | "offer";

export async function listApplications(input: ListApplicationsInput) {
  const paging = getPagination(input);
  const query: Record<string, unknown> = { userId: new Types.ObjectId(input.userId) };
  if (input.status) {
    query.status = input.status;
  }

  const [items, total] = await Promise.all([
    ApplicationModel.find(query).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit),
    ApplicationModel.countDocuments(query)
  ]);

  return {
    items,
    total,
    page: paging.page,
    limit: paging.limit
  };
}

export async function createApplication(input: CreateApplicationInput) {
  const lastDateToApply = input.lastDateToApply ? new Date(input.lastDateToApply) : undefined;

  return ApplicationModel.create({
    userId: input.userId,
    company: input.company,
    role: input.role,
    status: input.status,
    appliedDate: input.appliedDate ? new Date(input.appliedDate) : undefined,
    lastDateToApply,
    lastDateToApplyNotified: false,
    notes: input.notes ?? []
  });
}

export async function updateApplicationStatus(
  userId: string,
  applicationId: string,
  status: ApplicationStatus
) {
  return ApplicationModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(applicationId),
      userId: new Types.ObjectId(userId)
    },
    { $set: { status } },
    { new: true }
  );
}
