import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import { generateRoadmap } from "./ai.service";

export const generateRoadmapController = asyncHandler(async (req: Request, res: Response) => {
  const roadmap = await generateRoadmap(req.user!.id, req.body.goal);
  res.status(StatusCodes.OK).json(ok({ roadmap }));
});
