import { model, Schema, Types } from "mongoose";

export interface UserProblemDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  problemId: Types.ObjectId;
  status: "solved" | "attempted" | "revision" | "revise";
  attempts: number;
  notes: string[];
  date: Date;
  lastSolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userProblemSchema = new Schema<UserProblemDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true },
    status: { type: String, enum: ["solved", "attempted", "revision", "revise"], default: "attempted" },
    attempts: { type: Number, default: 1, min: 1 },
    notes: { type: [String], default: [] },
    date: { type: Date, required: true, default: Date.now },
    lastSolvedAt: { type: Date }
  },
  { timestamps: true }
);

userProblemSchema.index({ userId: 1, createdAt: -1 });
userProblemSchema.index({ userId: 1, date: -1 });
userProblemSchema.index({ userId: 1, status: 1 });
userProblemSchema.index({ userId: 1, problemId: 1 }, { unique: true });

export const UserProblemModel = model<UserProblemDoc>("UserProblem", userProblemSchema);
