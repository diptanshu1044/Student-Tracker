import { model, Schema, Types } from "mongoose";

export interface PlannerProfileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description?: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const plannerProfileSchema = new Schema<PlannerProfileDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    color: { type: String, required: true, default: "#2563eb" }
  },
  { timestamps: true }
);

plannerProfileSchema.index({ userId: 1, name: 1 }, { unique: true });

export const PlannerProfileModel = model<PlannerProfileDoc>("PlannerProfile", plannerProfileSchema);
