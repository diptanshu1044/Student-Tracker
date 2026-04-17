import { model, Schema, Types } from "mongoose";

export type PlannerTaskPriority = "low" | "medium" | "high";
export type PlannerTaskStatus = "pending" | "completed" | "missed";
export type PlannerTaskSource = "manual" | "csv" | "json" | "excel" | "google";

export interface PlannerTaskDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  profileId: Types.ObjectId;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  priority: PlannerTaskPriority;
  status: PlannerTaskStatus;
  reminderTime?: Date;
  source: PlannerTaskSource;
  notified: boolean;
  googleEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const plannerTaskSchema = new Schema<PlannerTaskDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: "PlannerProfile", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["pending", "completed", "missed"], default: "pending" },
    reminderTime: { type: Date },
    source: { type: String, enum: ["manual", "csv", "json", "excel", "google"], default: "manual" },
    notified: { type: Boolean, default: false },
    googleEventId: { type: String }
  },
  { timestamps: true }
);

plannerTaskSchema.index({ userId: 1, startTime: 1 });
plannerTaskSchema.index({ userId: 1, profileId: 1, startTime: 1 });
plannerTaskSchema.index({ userId: 1, reminderTime: 1, notified: 1 });

export const PlannerTaskModel = model<PlannerTaskDoc>("PlannerTask", plannerTaskSchema);
