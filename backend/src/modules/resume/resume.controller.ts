import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import { createResume, listResumes } from "./resume.service";

export const listResumesController = asyncHandler(async (req: Request, res: Response) => {
  const data = await listResumes(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const createResumeController = asyncHandler(async (req: Request, res: Response) => {
  const data = await createResume({ userId: req.user!.id, ...req.body });
  res.status(StatusCodes.CREATED).json(ok(data));
});
