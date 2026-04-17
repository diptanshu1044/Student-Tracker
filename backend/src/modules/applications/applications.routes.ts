import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import {
  createApplicationController,
  listApplicationsController,
  updateApplicationStatusController
} from "./applications.controller";

const createApplicationSchema = z.object({
  body: z.object({
    company: z.string().min(1),
    role: z.string().min(1),
    status: z.enum(["to_apply", "applied", "interview", "rejected", "offer"]).optional(),
    appliedDate: z.string().datetime().optional(),
    lastDateToApply: z.string().datetime().optional(),
    notes: z.array(z.string()).optional()
  })
});

const updateApplicationStatusSchema = z.object({
  params: z.object({
    applicationId: z.string().min(12)
  }),
  body: z.object({
    status: z.enum(["to_apply", "applied", "interview", "rejected", "offer"])
  })
});

export const applicationsRouter = Router();

applicationsRouter.use(authGuard);
applicationsRouter.get("/", listApplicationsController);
applicationsRouter.post("/", validate(createApplicationSchema), createApplicationController);
applicationsRouter.patch(
  "/:applicationId/status",
  validate(updateApplicationStatusSchema),
  updateApplicationStatusController
);
