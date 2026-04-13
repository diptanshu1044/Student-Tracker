import { model, Schema, Types } from "mongoose";

export interface ApplicationDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  company: string;
  role: string;
  status: "applied" | "interview" | "rejected" | "offer";
  appliedDate?: Date;
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<ApplicationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["applied", "interview", "rejected", "offer"],
      default: "applied"
    },
    appliedDate: { type: Date },
    notes: { type: [String], default: [] }
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ userId: 1, company: 1, role: 1 });

export const ApplicationModel = model<ApplicationDoc>("Application", applicationSchema);
