import { Types } from "mongoose";
import { TaskModel } from "../../models/task.model";
import { getPagination } from "../../shared/utils/pagination";

interface ListTasksInput {
  userId: string;
  page?: number;
  limit?: number;
  completed?: boolean;
}

interface CreateTaskInput {
  userId: string;
  title: string;
  type: "dsa" | "job" | "study";
  priority: "low" | "medium" | "high";
  dueDate?: string;
}

export async function listTasks(input: ListTasksInput) {
  const paging = getPagination(input);
  const query: Record<string, unknown> = { userId: new Types.ObjectId(input.userId) };

  if (typeof input.completed === "boolean") {
    query.completed = input.completed;
  }

  const [items, total] = await Promise.all([
    TaskModel.find(query).sort({ dueDate: 1, createdAt: -1 }).skip(paging.skip).limit(paging.limit),
    TaskModel.countDocuments(query)
  ]);

  return {
    items,
    total,
    page: paging.page,
    limit: paging.limit
  };
}

export async function createTask(input: CreateTaskInput) {
  return TaskModel.create({
    userId: input.userId,
    title: input.title,
    type: input.type,
    priority: input.priority,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined
  });
}

export async function markTaskComplete(userId: string, taskId: string, completed: boolean) {
  return TaskModel.findOneAndUpdate(
    { _id: new Types.ObjectId(taskId), userId: new Types.ObjectId(userId) },
    { $set: { completed } },
    { new: true }
  );
}
