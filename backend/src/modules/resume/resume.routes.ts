import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import { createResumeController, listResumesController } from "./resume.controller";

const createResumeSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    content: z.union([z.record(z.unknown()), z.string().min(1)]),
    tags: z.array(z.string()).optional()
  })
});

export const resumeRouter = Router();

resumeRouter.use(authGuard);
resumeRouter.get("/", listResumesController);
resumeRouter.post("/", validate(createResumeSchema), createResumeController);
