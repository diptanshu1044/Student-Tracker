import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import {
  createApplication,
  listApplications,
  updateApplicationStatus
} from "./applications.service";

export const listApplicationsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await listApplications({
    userId: req.user!.id,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status as "applied" | "interview" | "rejected" | "offer" | undefined
  });

  res.status(StatusCodes.OK).json(ok(data));
});

export const createApplicationController = asyncHandler(async (req: Request, res: Response) => {
  const data = await createApplication({
    userId: req.user!.id,
    ...req.body
  });

  res.status(StatusCodes.CREATED).json(ok(data));
});

export const updateApplicationStatusController = asyncHandler(async (req: Request, res: Response) => {
  const data = await updateApplicationStatus(
    req.user!.id,
    req.params.applicationId,
    req.body.status
  );

  res.status(StatusCodes.OK).json(ok(data));
});
