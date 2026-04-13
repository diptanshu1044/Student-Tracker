import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import { getStreak } from "./streak.service";
import { getTopicBreakdown, getWeakTopics, getWeeklySolved } from "./analytics.service";

export const weeklySolvedController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getWeeklySolved(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const topicBreakdownController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getTopicBreakdown(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const weakTopicsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getWeakTopics(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const streakController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getStreak(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});
