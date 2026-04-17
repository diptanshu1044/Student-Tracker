import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import { assertImportFileExists, importPlannerTasks } from "./services/import.service";
import {
  disconnectGoogleCalendar,
  getGoogleConnectUrl,
  handleGoogleCallback,
  syncTasksToGoogleCalendar
} from "./services/google-calendar.service";
import {
  createPlannerProfile,
  createPlannerTask,
  createTask,
  deletePlannerProfile,
  deletePlannerTask,
  listAllPlannerTasks,
  listPlannerProfiles,
  listPlannerTasks,
  listPlannerTasksByProfile,
  listTasks,
  markPlannerTaskStatus,
  markTaskComplete,
  updatePlannerProfile,
  updatePlannerTask
} from "./planner.service";

export const listTasksController = asyncHandler(async (req: Request, res: Response) => {
  const data = await listTasks({
    userId: req.user!.id,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    completed: req.query.completed ? req.query.completed === "true" : undefined
  });

  res.status(StatusCodes.OK).json(ok(data));
});

export const createTaskController = asyncHandler(async (req: Request, res: Response) => {
  const data = await createTask({ userId: req.user!.id, ...req.body });
  res.status(StatusCodes.CREATED).json(ok(data));
});

export const completeTaskController = asyncHandler(async (req: Request, res: Response) => {
  const data = await markTaskComplete(req.user!.id, req.params.taskId, req.body.completed);
  res.status(StatusCodes.OK).json(ok(data));
});

export const listPlannerProfilesController = asyncHandler(async (req: Request, res: Response) => {
  const data = await listPlannerProfiles(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const createPlannerProfileController = asyncHandler(async (req: Request, res: Response) => {
  const data = await createPlannerProfile({
    userId: req.user!.id,
    name: req.body.name,
    description: req.body.description,
    color: req.body.color
  });
  res.status(StatusCodes.CREATED).json(ok(data));
});

export const updatePlannerProfileController = asyncHandler(async (req: Request, res: Response) => {
  const data = await updatePlannerProfile({
    userId: req.user!.id,
    profileId: req.params.profileId,
    ...req.body
  });
  res.status(StatusCodes.OK).json(ok(data));
});

export const deletePlannerProfileController = asyncHandler(async (req: Request, res: Response) => {
  const data = await deletePlannerProfile(req.user!.id, req.params.profileId);
  res.status(StatusCodes.OK).json(ok(data));
});

export const listAllPlannerTasksController = asyncHandler(async (req: Request, res: Response) => {
  const data = await listAllPlannerTasks({
    userId: req.user!.id,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    priority: req.query.priority as "low" | "medium" | "high" | undefined,
    status: req.query.status as "pending" | "completed" | "missed" | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined
  });
  res.status(StatusCodes.OK).json(ok(data));
});

export const listPlannerTasksByProfileController = asyncHandler(async (req: Request, res: Response) => {
  const data = await listPlannerTasksByProfile({
    userId: req.user!.id,
    profileId: req.params.profileId,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    priority: req.query.priority as "low" | "medium" | "high" | undefined,
    status: req.query.status as "pending" | "completed" | "missed" | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined
  });
  res.status(StatusCodes.OK).json(ok(data));
});

export const listPlannerTasksController = asyncHandler(async (req: Request, res: Response) => {
  const data = await listPlannerTasks({
    userId: req.user!.id,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    profileId: req.query.profileId as string | undefined,
    priority: req.query.priority as "low" | "medium" | "high" | undefined,
    status: req.query.status as "pending" | "completed" | "missed" | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined
  });
  res.status(StatusCodes.OK).json(ok(data));
});

export const createPlannerTaskController = asyncHandler(async (req: Request, res: Response) => {
  const data = await createPlannerTask({
    userId: req.user!.id,
    ...req.body
  });
  res.status(StatusCodes.CREATED).json(ok(data));
});

export const updatePlannerTaskController = asyncHandler(async (req: Request, res: Response) => {
  const data = await updatePlannerTask({
    userId: req.user!.id,
    taskId: req.params.taskId,
    ...req.body
  });
  res.status(StatusCodes.OK).json(ok(data));
});

export const deletePlannerTaskController = asyncHandler(async (req: Request, res: Response) => {
  const data = await deletePlannerTask(req.user!.id, req.params.taskId);
  res.status(StatusCodes.OK).json(ok(data));
});

export const markPlannerTaskStatusController = asyncHandler(async (req: Request, res: Response) => {
  const data = await markPlannerTaskStatus(req.user!.id, req.params.taskId, req.body.status);
  res.status(StatusCodes.OK).json(ok(data));
});

export const importPlannerTasksController = asyncHandler(async (req: Request, res: Response) => {
  assertImportFileExists(req.file);

  const data = await importPlannerTasks({
    userId: req.user!.id,
    profileId: req.body.profileId,
    file: req.file
  });

  res.status(StatusCodes.OK).json(ok(data));
});

export const googleConnectController = asyncHandler(async (req: Request, res: Response) => {
  const data = getGoogleConnectUrl(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const googleDisconnectController = asyncHandler(async (req: Request, res: Response) => {
  const data = await disconnectGoogleCalendar(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const googleCallbackController = asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const redirectBase = `${env.APP_BASE_URL.replace(/\/$/, "")}/planner`;

  if (!code || !state) {
    res.redirect(`${redirectBase}?google=error&reason=missing_oauth_params`);
    return;
  }

  try {
    await handleGoogleCallback(code, state);
    res.redirect(`${redirectBase}?google=connected`);
  } catch {
    res.redirect(`${redirectBase}?google=error&reason=callback_failed`);
  }
});

export const googleSyncController = asyncHandler(async (req: Request, res: Response) => {
  const data = await syncTasksToGoogleCalendar({
    userId: req.user!.id,
    profileId: req.body.profileId
  });
  res.status(StatusCodes.OK).json(ok(data));
});
