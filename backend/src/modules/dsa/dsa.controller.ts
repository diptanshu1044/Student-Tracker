import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import { listProblems, listUserProblems, trackProblem } from "./dsa.service";

export const listProblemsController = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const data = await listProblems(page, limit);
  res.status(StatusCodes.OK).json(ok(data));
});

export const listUserProblemsController = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const status = req.query.status as "solved" | "revise" | undefined;

  const data = await listUserProblems({
    userId: req.user!.id,
    page,
    limit,
    status
  });

  res.status(StatusCodes.OK).json(ok(data));
});

export const trackProblemController = asyncHandler(async (req: Request, res: Response) => {
  const data = await trackProblem({
    userId: req.user!.id,
    ...req.body
  });

  res.status(StatusCodes.OK).json(ok(data));
});
