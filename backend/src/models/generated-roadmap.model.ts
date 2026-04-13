import { model, Schema, Types } from "mongoose";

export interface GeneratedRoadmapDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  prompt: string;
  roadmap: string;
  createdAt: Date;
  updatedAt: Date;
}

const generatedRoadmapSchema = new Schema<GeneratedRoadmapDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    prompt: { type: String, required: true, trim: true },
    roadmap: { type: String, required: true }
  },
  { timestamps: true }
);

generatedRoadmapSchema.index({ userId: 1, createdAt: -1 });

export const GeneratedRoadmapModel = model<GeneratedRoadmapDoc>(
  "GeneratedRoadmap",
  generatedRoadmapSchema
);
