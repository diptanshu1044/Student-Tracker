import { model, Schema, Types } from "mongoose";

export interface ResumeDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  content: Record<string, unknown> | string;
  tags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<ResumeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    content: { type: Schema.Types.Mixed, required: true },
    tags: { type: [String], default: [] },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

resumeSchema.index({ userId: 1, updatedAt: -1 });
resumeSchema.index({ userId: 1, name: 1 });

export const ResumeModel = model<ResumeDoc>("Resume", resumeSchema);
