import { model, Schema, Types } from "mongoose";

export interface TaskDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  type: "dsa" | "job" | "study";
  priority: "low" | "medium" | "high";
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["dsa", "job", "study"], required: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, completed: 1 });

export const TaskModel = model<TaskDoc>("Task", taskSchema);
