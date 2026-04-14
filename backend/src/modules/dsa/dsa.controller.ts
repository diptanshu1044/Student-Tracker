import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import {
  deleteTrackedProblem,
  getActivity,
  getStats,
  getWeakTopics,
  listProblemCatalog,
  listTrackedProblems,
  trackProblem,
  updateTrackedProblem
} from "./dsa.service";

export const listProblemsController = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const difficulty = req.query.difficulty as "easy" | "medium" | "hard" | undefined;
  const topic = req.query.topic as string | undefined;
  const status = req.query.status as "solved" | "attempted" | "revision" | "revise" | undefined;
  const search = req.query.search as string | undefined;

  const data = await listTrackedProblems({
    userId: req.user!.id,
    page,
    limit,
    difficulty,
    topic,
    status,
    search
  });

  res.status(StatusCodes.OK).json(ok(data));
});

export const listProblemCatalogController = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const data = await listProblemCatalog(page, limit);
  res.status(StatusCodes.OK).json(ok(data));
});

export const activityController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getActivity(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const weakTopicsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getWeakTopics(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const statsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getStats(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const createProblemLogController = asyncHandler(async (req: Request, res: Response) => {
  const data = await trackProblem({
    userId: req.user!.id,
    ...req.body
  });

  res.status(StatusCodes.CREATED).json(ok(data));
});

export const updateProblemLogController = asyncHandler(async (req: Request, res: Response) => {
  const data = await updateTrackedProblem({
    id: req.params.id,
    userId: req.user!.id,
    ...req.body
  });

  res.status(StatusCodes.OK).json(ok(data));
});

export const deleteProblemLogController = asyncHandler(async (req: Request, res: Response) => {
  const data = await deleteTrackedProblem(req.params.id, req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});
