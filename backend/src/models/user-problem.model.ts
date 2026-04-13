import { model, Schema, Types } from "mongoose";

export interface UserProblemDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  problemId: Types.ObjectId;
  status: "solved" | "revise";
  attempts: number;
  lastSolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userProblemSchema = new Schema<UserProblemDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true },
    status: { type: String, enum: ["solved", "revise"], default: "solved" },
    attempts: { type: Number, default: 1, min: 1 },
    lastSolvedAt: { type: Date }
  },
  { timestamps: true }
);

userProblemSchema.index({ userId: 1, createdAt: -1 });
userProblemSchema.index({ userId: 1, status: 1 });
userProblemSchema.index({ userId: 1, problemId: 1 }, { unique: true });

export const UserProblemModel = model<UserProblemDoc>("UserProblem", userProblemSchema);
