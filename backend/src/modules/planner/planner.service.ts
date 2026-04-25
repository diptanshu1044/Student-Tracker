import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { env } from "../../config/env";
import { PlannerProfileModel } from "../../models/planner-profile.model";
import {
  PlannerTaskModel,
  type PlannerTaskPriority,
  type PlannerTaskStatus
} from "../../models/planner-task.model";
import { AppError } from "../../shared/utils/app-error";
import { getPagination } from "../../shared/utils/pagination";
import { syncTaskToGoogleCalendar } from "./services/google-calendar.service";

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
  priority: PlannerTaskPriority;
  dueDate?: string;
}

interface CreatePlannerProfileInput {
  userId: string;
  name: string;
  description?: string;
  color?: string;
}

interface UpdatePlannerProfileInput {
  userId: string;
  profileId: string;
  name?: string;
  description?: string;
  color?: string;
}

interface CreatePlannerTaskInput {
  userId: string;
  profileId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  priority: PlannerTaskPriority;
  status?: PlannerTaskStatus;
  reminderTime?: string;
}

interface UpdatePlannerTaskInput {
  userId: string;
  taskId: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  priority?: PlannerTaskPriority;
  status?: PlannerTaskStatus;
  reminderTime?: string;
}

interface PlannerFilterInput {
  userId: string;
  page?: number;
  limit?: number;
  profileId?: string;
  priority?: PlannerTaskPriority;
  status?: PlannerTaskStatus;
  startDate?: string;
  endDate?: string;
}

function validateWindow(startTime: Date, endTime: Date) {
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new AppError("startTime and endTime must be valid ISO datetime", StatusCodes.BAD_REQUEST);
  }

  if (endTime <= startTime) {
    throw new AppError("endTime must be later than startTime", StatusCodes.BAD_REQUEST);
  }
}

async function ensureProfileOwner(userId: string, profileId: string) {
  const profile = await PlannerProfileModel.findOne({
    _id: new Types.ObjectId(profileId),
    userId: new Types.ObjectId(userId)
  });

  if (!profile) {
    throw new AppError("Planner profile not found", StatusCodes.NOT_FOUND);
  }

  return profile;
}

async function getOrCreateDefaultProfile(userId: string) {
  const existing = await PlannerProfileModel.findOne({
    userId: new Types.ObjectId(userId),
    name: env.PLANNER_DEFAULT_PROFILE_NAME
  });

  if (existing) {
    return existing;
  }

  return PlannerProfileModel.create({
    userId,
    name: env.PLANNER_DEFAULT_PROFILE_NAME,
    description: env.PLANNER_DEFAULT_PROFILE_DESCRIPTION,
    color: env.PLANNER_DEFAULT_PROFILE_COLOR
  });
}

export async function createPlannerProfile(input: CreatePlannerProfileInput) {
  return PlannerProfileModel.create({
    userId: input.userId,
    name: input.name,
    description: input.description,
    color: input.color ?? "#2563eb"
  });
}

export async function listPlannerProfiles(userId: string) {
  const profiles = await PlannerProfileModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: 1 });

  if (profiles.length === 0 && env.PLANNER_AUTO_CREATE_DEFAULT_PROFILE) {
    return [await getOrCreateDefaultProfile(userId)];
  }

  return profiles;
}

export async function updatePlannerProfile(input: UpdatePlannerProfileInput) {
  await ensureProfileOwner(input.userId, input.profileId);

  return PlannerProfileModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(input.profileId),
      userId: new Types.ObjectId(input.userId)
    },
    {
      $set: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.color !== undefined ? { color: input.color } : {})
      }
    },
    { new: true }
  );
}

export async function deletePlannerProfile(userId: string, profileId: string) {
  await ensureProfileOwner(userId, profileId);

  await Promise.all([
    PlannerTaskModel.deleteMany({ profileId: new Types.ObjectId(profileId), userId: new Types.ObjectId(userId) }),
    PlannerProfileModel.deleteOne({ _id: new Types.ObjectId(profileId), userId: new Types.ObjectId(userId) })
  ]);

  return { deleted: true as const };
}

export async function createPlannerTask(input: CreatePlannerTaskInput) {
  await ensureProfileOwner(input.userId, input.profileId);

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  validateWindow(startTime, endTime);

  const reminderTime = input.reminderTime ? new Date(input.reminderTime) : undefined;
  if (input.reminderTime && Number.isNaN(reminderTime!.getTime())) {
    throw new AppError("reminderTime must be a valid ISO datetime", StatusCodes.BAD_REQUEST);
  }

  const task = await PlannerTaskModel.create({
    userId: input.userId,
    profileId: input.profileId,
    title: input.title,
    description: input.description,
    startTime,
    endTime,
    priority: input.priority,
    status: input.status ?? "pending",
    reminderTime,
    notified: false,
    source: "manual"
  });

  void syncTaskToGoogleCalendar(task._id.toString());

  return task;
}

export async function updatePlannerTask(input: UpdatePlannerTaskInput) {
  const current = await PlannerTaskModel.findOne({
    _id: new Types.ObjectId(input.taskId),
    userId: new Types.ObjectId(input.userId)
  });

  if (!current) {
    throw new AppError("Task not found", StatusCodes.NOT_FOUND);
  }

  const nextStart = input.startTime ? new Date(input.startTime) : current.startTime;
  const nextEnd = input.endTime ? new Date(input.endTime) : current.endTime;
  validateWindow(nextStart, nextEnd);

  const reminderTime = input.reminderTime === undefined
    ? current.reminderTime
    : input.reminderTime
      ? new Date(input.reminderTime)
      : undefined;

  const reminderChanged = input.reminderTime !== undefined && (
    (current.reminderTime?.getTime() ?? null) !== (reminderTime?.getTime() ?? null)
  );

  if (input.reminderTime && Number.isNaN(reminderTime!.getTime())) {
    throw new AppError("reminderTime must be a valid ISO datetime", StatusCodes.BAD_REQUEST);
  }

  const updated = await PlannerTaskModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(input.taskId),
      userId: new Types.ObjectId(input.userId)
    },
    {
      $set: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.startTime !== undefined ? { startTime: nextStart } : {}),
        ...(input.endTime !== undefined ? { endTime: nextEnd } : {}),
        ...(input.reminderTime !== undefined ? { reminderTime } : {}),
        ...(reminderChanged ? { notified: false } : {})
      }
    },
    { new: true }
  );

  if (!updated) {
    throw new AppError("Task not found", StatusCodes.NOT_FOUND);
  }

  void syncTaskToGoogleCalendar(updated._id.toString());

  return updated;
}

export async function deletePlannerTask(userId: string, taskId: string) {
  const result = await PlannerTaskModel.deleteOne({
    _id: new Types.ObjectId(taskId),
    userId: new Types.ObjectId(userId)
  });

  if (result.deletedCount === 0) {
    throw new AppError("Task not found", StatusCodes.NOT_FOUND);
  }

  return { deleted: true as const };
}

export async function listPlannerTasks(input: PlannerFilterInput) {
  const paging = getPagination(input);
  const query: Record<string, unknown> = {
    userId: new Types.ObjectId(input.userId)
  };

  if (input.profileId) {
    query.profileId = new Types.ObjectId(input.profileId);
  }

  if (input.priority) {
    query.priority = input.priority;
  }

  if (input.status) {
    query.status = input.status;
  }

  if (input.startDate || input.endDate) {
    query.startTime = {
      ...(input.startDate ? { $gte: new Date(input.startDate) } : {}),
      ...(input.endDate ? { $lte: new Date(input.endDate) } : {})
    };
  }

  const [items, total] = await Promise.all([
    PlannerTaskModel.find(query)
      .populate("profileId", "name color")
      .sort({ startTime: 1 })
      .skip(paging.skip)
      .limit(paging.limit),
    PlannerTaskModel.countDocuments(query)
  ]);

  return {
    items,
    total,
    page: paging.page,
    limit: paging.limit
  };
}

export async function listPlannerTasksByProfile(input: PlannerFilterInput & { profileId: string }) {
  return listPlannerTasks(input);
}

export async function listAllPlannerTasks(input: Omit<PlannerFilterInput, "profileId">) {
  return listPlannerTasks(input);
}

export async function markPlannerTaskStatus(
  userId: string,
  taskId: string,
  status: PlannerTaskStatus
) {
  const updated = await PlannerTaskModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId)
    },
    { $set: { status } },
    { new: true }
  );

  if (!updated) {
    throw new AppError("Task not found", StatusCodes.NOT_FOUND);
  }

  return updated;
}

export async function listTasks(input: ListTasksInput) {
  const plannerData = await listPlannerTasks({
    userId: input.userId,
    page: input.page,
    limit: input.limit,
    status: input.completed === undefined ? undefined : input.completed ? "completed" : "pending"
  });

  return {
    ...plannerData,
    items: plannerData.items.map((item) => ({
      _id: item._id,
      title: item.title,
      type: "study" as const,
      priority: item.priority,
      dueDate: item.startTime,
      completed: item.status === "completed",
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }))
  };
}

export async function createTask(input: CreateTaskInput) {
  const profile = await getOrCreateDefaultProfile(input.userId);
  const startTime = input.dueDate ? new Date(input.dueDate) : new Date();
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  const created = await createPlannerTask({
    userId: input.userId,
    profileId: profile._id.toString(),
    title: input.title,
    priority: input.priority,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    description: `${input.type.toUpperCase()} task`
  });

  return {
    _id: created._id,
    title: created.title,
    type: input.type,
    priority: created.priority,
    dueDate: created.startTime,
    completed: created.status === "completed",
    createdAt: created.createdAt,
    updatedAt: created.updatedAt
  };
}

export async function markTaskComplete(userId: string, taskId: string, completed: boolean) {
  const updated = await markPlannerTaskStatus(userId, taskId, completed ? "completed" : "pending");

  return {
    _id: updated._id,
    title: updated.title,
    type: "study" as const,
    priority: updated.priority,
    dueDate: updated.startTime,
    completed: updated.status === "completed",
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt
  };
}
