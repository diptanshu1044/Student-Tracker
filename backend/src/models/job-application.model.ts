import { model, Schema, Types } from "mongoose";

export const JOB_STATUSES = ["applied", "oa", "interview", "rejected", "offer"] as const;
export const JOB_PRIORITIES = ["low", "medium", "high"] as const;
export const INTERVIEW_TYPES = ["hr", "technical", "system-design"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
export type JobPriority = (typeof JOB_PRIORITIES)[number];
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export interface JobStatusHistoryItem {
  status: JobStatus;
  changedAt: Date;
}

export interface JobApplicationDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyName: string;
  role: string;
  status: JobStatus;
  appliedDate: Date;
  lastUpdated: Date;
  jobLink?: string;
  referral: boolean;
  notes?: string;
  resumeVersion?: string;
  followUpDate?: Date;
  priority: JobPriority;
  followUpNotified: boolean;
  interviewDate?: Date;
  interviewType?: InterviewType;
  interviewNotified: boolean;
  tags: string[];
  statusHistory: JobStatusHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<JobStatusHistoryItem>(
  {
    status: { type: String, enum: JOB_STATUSES, required: true },
    changedAt: { type: Date, required: true }
  },
  { _id: false }
);

const jobApplicationSchema = new Schema<JobApplicationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    status: { type: String, enum: JOB_STATUSES, default: "applied" },
    appliedDate: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    jobLink: { type: String, trim: true },
    referral: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    resumeVersion: { type: String, trim: true },
    followUpDate: { type: Date },
    priority: { type: String, enum: JOB_PRIORITIES, default: "medium" },
    followUpNotified: { type: Boolean, default: false },
    interviewDate: { type: Date },
    interviewType: { type: String, enum: INTERVIEW_TYPES },
    interviewNotified: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    statusHistory: { type: [statusHistorySchema], default: [] }
  },
  { timestamps: true }
);

jobApplicationSchema.index({ userId: 1, status: 1, createdAt: -1 });
jobApplicationSchema.index({ userId: 1, companyName: 1, role: 1 });
jobApplicationSchema.index({ userId: 1, followUpDate: 1, followUpNotified: 1 });
jobApplicationSchema.index({ userId: 1, interviewDate: 1, interviewNotified: 1 });
jobApplicationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
jobApplicationSchema.index({ companyName: "text", role: "text" });

export const JobApplicationModel = model<JobApplicationDoc>("JobApplication", jobApplicationSchema);
