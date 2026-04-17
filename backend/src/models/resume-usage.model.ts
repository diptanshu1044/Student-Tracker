import { model, Schema, Types } from "mongoose";

export const RESUME_USAGE_OUTCOMES = ["applied", "oa", "interview", "offer", "rejected"] as const;
export type ResumeUsageOutcome = (typeof RESUME_USAGE_OUTCOMES)[number];

export interface ResumeUsageDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;
  jobId: Types.ObjectId;
  usedAt: Date;
  outcome: ResumeUsageOutcome;
  createdAt: Date;
  updatedAt: Date;
}

const resumeUsageSchema = new Schema<ResumeUsageDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "JobApplication", required: true },
    usedAt: { type: Date, default: Date.now },
    outcome: { type: String, enum: RESUME_USAGE_OUTCOMES, default: "applied" }
  },
  { timestamps: true }
);

resumeUsageSchema.index({ userId: 1, resumeId: 1, usedAt: -1 });
resumeUsageSchema.index({ userId: 1, jobId: 1 }, { unique: true });
resumeUsageSchema.index({ userId: 1, outcome: 1, usedAt: -1 });

export const ResumeUsageModel = model<ResumeUsageDoc>("ResumeUsage", resumeUsageSchema);
