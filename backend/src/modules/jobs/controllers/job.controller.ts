import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../../shared/utils/async-handler";
import { ok } from "../../../shared/utils/api-response";
import {
  addJobApplication,
  deleteJobApplication,
  getJobsMetadata,
  listJobApplications,
  updateJobApplication,
  updateJobApplicationStatus
} from "../services/job.service";
import { getApplicationFunnel, getJobInsights, getJobStats } from "../services/analytics.service";

export const addJobApplicationController = asyncHandler(async (req: Request, res: Response) => {
  const data = await addJobApplication({
    userId: req.user!.id,
    ...req.body
  });

  res.status(StatusCodes.CREATED).json(ok(data));
});

export const listJobApplicationsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await listJobApplications({
    userId: req.user!.id,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status as "applied" | "oa" | "interview" | "rejected" | "offer" | undefined,
    company: req.query.company as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    priority: req.query.priority as "low" | "medium" | "high" | undefined,
    search: req.query.search as string | undefined
  });

  res.status(StatusCodes.OK).json(ok(data));
});

export const updateJobStatusController = asyncHandler(async (req: Request, res: Response) => {
  const data = await updateJobApplicationStatus(req.user!.id, req.params.id, req.body.status);
  res.status(StatusCodes.OK).json(ok(data));
});

export const updateJobApplicationController = asyncHandler(async (req: Request, res: Response) => {
  const data = await updateJobApplication(req.user!.id, req.params.id, req.body);
  res.status(StatusCodes.OK).json(ok(data));
});

export const deleteJobApplicationController = asyncHandler(async (req: Request, res: Response) => {
  const data = await deleteJobApplication(req.user!.id, req.params.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const getJobStatsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getJobStats(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const getJobFunnelController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getApplicationFunnel(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const getJobInsightsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getJobInsights(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const getJobsMetadataController = asyncHandler(async (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json(ok(getJobsMetadata()));
});
