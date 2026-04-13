import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import { createTask, listTasks, markTaskComplete } from "./planner.service";

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
