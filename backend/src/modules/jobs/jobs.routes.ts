import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import {
  addJobApplicationController,
  deleteJobApplicationController,
  getJobFunnelController,
  getJobInsightsController,
  getJobsMetadataController,
  getJobStatsController,
  listJobApplicationsController,
  updateJobApplicationController,
  updateJobStatusController
} from "./controllers/job.controller";

const objectIdSchema = z.string().length(24);
const jobStatusSchema = z.enum(["applied", "oa", "interview", "rejected", "offer"]);
const jobPrioritySchema = z.enum(["low", "medium", "high"]);
const interviewTypeSchema = z.enum(["hr", "technical", "system-design"]);

const createJobSchema = z.object({
  body: z.object({
    resumeId: objectIdSchema.optional(),
    companyName: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    status: jobStatusSchema.optional(),
    jobLink: z.string().url().optional(),
    referral: z.boolean().optional(),
    notes: z.string().max(2000).optional(),
    resumeVersion: z.string().max(200).optional(),
    followUpDate: z.string().datetime().optional(),
    priority: jobPrioritySchema.optional(),
    interviewDate: z.string().datetime().optional(),
    interviewType: interviewTypeSchema.optional(),
    tags: z.array(z.string().min(1).max(50)).max(10).optional()
  })
});

const listJobsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    status: jobStatusSchema.optional(),
    company: z.string().max(200).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    priority: jobPrioritySchema.optional(),
    search: z.string().max(200).optional()
  })
});

const statusUpdateSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    status: jobStatusSchema
  })
});

const updateJobSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z
    .object({
      resumeId: objectIdSchema.nullable().optional(),
      companyName: z.string().min(1).max(200).optional(),
      role: z.string().min(1).max(200).optional(),
      jobLink: z.string().url().optional(),
      referral: z.boolean().optional(),
      notes: z.string().max(2000).optional(),
      resumeVersion: z.string().max(200).optional(),
      followUpDate: z.string().datetime().nullable().optional(),
      priority: jobPrioritySchema.optional(),
      interviewDate: z.string().datetime().nullable().optional(),
      interviewType: interviewTypeSchema.nullable().optional(),
      tags: z.array(z.string().min(1).max(50)).max(10).optional()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required"
    })
});

const idParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const jobsRouter = Router();

jobsRouter.use(authGuard);

jobsRouter.get("/", validate(listJobsSchema), listJobApplicationsController);
jobsRouter.post("/add", validate(createJobSchema), addJobApplicationController);
jobsRouter.put("/:id/status", validate(statusUpdateSchema), updateJobStatusController);
jobsRouter.put("/:id", validate(updateJobSchema), updateJobApplicationController);
jobsRouter.delete("/:id", validate(idParamSchema), deleteJobApplicationController);

jobsRouter.get("/stats", getJobStatsController);
jobsRouter.get("/funnel", getJobFunnelController);
jobsRouter.get("/insights", getJobInsightsController);
jobsRouter.get("/metadata", getJobsMetadataController);
