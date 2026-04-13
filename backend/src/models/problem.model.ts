import { model, Schema, Types } from "mongoose";

export interface ProblemDoc {
  _id: Types.ObjectId;
  title: string;
  platform: "leetcode" | "gfg";
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

const problemSchema = new Schema<ProblemDoc>(
  {
    title: { type: String, required: true, trim: true },
    platform: { type: String, enum: ["leetcode", "gfg"], required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    topic: { type: String, required: true, trim: true }
  },
  { timestamps: false }
);

problemSchema.index({ topic: 1, difficulty: 1 });
problemSchema.index({ platform: 1, title: 1 }, { unique: true });

export const ProblemModel = model<ProblemDoc>("Problem", problemSchema);
