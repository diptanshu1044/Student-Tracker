import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../shared/utils/app-error";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import {
  compareResumes,
  createResume,
  createUploadedResume,
  deleteResume,
  getResumeById,
  getResumeFileAccessUrl,
  getResumeStats,
  listResumes,
  setDefaultResume,
  updateResume
} from "./services/resume.service";

export const listResumesController = asyncHandler(async (req: Request, res: Response) => {
  const tagsParam = typeof req.query.tags === "string" ? req.query.tags : undefined;
  const sortParam = typeof req.query.sort === "string" ? req.query.sort : undefined;

  const data = await listResumes({
    userId: req.user!.id,
    tags: tagsParam
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    sort: sortParam as "latest" | "most_used" | undefined
  });

  res.status(StatusCodes.OK).json(ok(data));
});

export const createResumeController = asyncHandler(async (req: Request, res: Response) => {
  const data = await createResume({ userId: req.user!.id, ...req.body });
  res.status(StatusCodes.CREATED).json(ok(data));
});

export const getResumeByIdController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getResumeById(req.user!.id, req.params.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const getResumeFileAccessUrlController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getResumeFileAccessUrl(req.user!.id, req.params.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const updateResumeController = asyncHandler(async (req: Request, res: Response) => {
  const data = await updateResume(req.user!.id, req.params.id, req.body);
  res.status(StatusCodes.OK).json(ok(data));
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
    tags: parsedTags,
    description: req.body.description,
    isDefault: req.body.isDefault === "true"
  });

  res.status(StatusCodes.CREATED).json(ok(data));
});

export const setDefaultResumeController = asyncHandler(async (req: Request, res: Response) => {
  const data = await setDefaultResume(req.user!.id, req.params.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const deleteResumeController = asyncHandler(async (req: Request, res: Response) => {
  const data = await deleteResume(req.user!.id, req.params.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const getResumeStatsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getResumeStats(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const compareResumesController = asyncHandler(async (req: Request, res: Response) => {
  const data = await compareResumes(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});
