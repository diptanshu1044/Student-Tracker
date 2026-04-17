import { model, Schema, Types } from "mongoose";

export const RESUME_FILE_TYPES = ["pdf", "docx"] as const;
export type ResumeFileType = (typeof RESUME_FILE_TYPES)[number];

export interface ResumeDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  content?: Record<string, unknown> | string;
  fileUrl?: string;
  fileType?: ResumeFileType;
  tags: string[];
  version: number;
  isDefault: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<ResumeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    content: { type: Schema.Types.Mixed },
    fileUrl: { type: String, trim: true },
    fileType: { type: String, enum: RESUME_FILE_TYPES },
    tags: { type: [String], default: [] },
    version: { type: Number, default: 1 },
    isDefault: { type: Boolean, default: false },
    description: { type: String, trim: true }
  },
  { timestamps: true }
);

resumeSchema.index({ userId: 1, updatedAt: -1 });
resumeSchema.index({ userId: 1, name: 1 });
resumeSchema.index({ userId: 1, isDefault: 1 });
resumeSchema.index({ userId: 1, tags: 1 });

export const ResumeModel = model<ResumeDoc>("Resume", resumeSchema);
