import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../shared/utils/app-error";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import { createResume, createUploadedResume, listResumes } from "./resume.service";

export const listResumesController = asyncHandler(async (req: Request, res: Response) => {
  const data = await listResumes(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const createResumeController = asyncHandler(async (req: Request, res: Response) => {
  const data = await createResume({ userId: req.user!.id, ...req.body });
  res.status(StatusCodes.CREATED).json(ok(data));
});

export const uploadResumeController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("Resume file is required", StatusCodes.BAD_REQUEST);
  }

  const parsedTags =
    typeof req.body.tags === "string"
      ? req.body.tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean)
      : undefined;

  const data = await createUploadedResume({
    userId: req.user!.id,
    file: req.file,
    name: req.body.name,
    tags: parsedTags
  });

  res.status(StatusCodes.CREATED).json(ok(data));
});
