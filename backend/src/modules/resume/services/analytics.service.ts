import { Types } from "mongoose";
import { ResumeUsageModel } from "../../../models/resume-usage.model";

function toObjectId(value: string) {
  return new Types.ObjectId(value);
}

export async function trackResumeUsageForJob(input: {
  userId: string;
  jobId: string;
  resumeId: string;
  outcome: "applied" | "oa" | "interview" | "offer" | "rejected";
  usedAt?: Date;
}) {
  const now = input.usedAt ?? new Date();

  return ResumeUsageModel.findOneAndUpdate(
    {
      userId: toObjectId(input.userId),
      jobId: toObjectId(input.jobId)
    },
    {
      $set: {
        resumeId: toObjectId(input.resumeId),
        outcome: input.outcome,
        usedAt: now
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

export async function syncResumeUsageOutcomeForJob(input: {
  userId: string;
  jobId: string;
  outcome: "applied" | "oa" | "interview" | "offer" | "rejected";
}) {
  await ResumeUsageModel.updateOne(
    {
      userId: toObjectId(input.userId),
      jobId: toObjectId(input.jobId)
    },
    {
      $set: {
        outcome: input.outcome
      }
    }
  );
}
