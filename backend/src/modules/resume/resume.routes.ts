import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import {
  compareResumesController,
  createResumeController,
  deleteResumeController,
  getResumeByIdController,
  getResumeFileAccessUrlController,
  getResumeStatsController,
  listResumesController,
  setDefaultResumeController,
  updateResumeController,
  uploadResumeController
} from "./resume.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const createResumeSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    content: z.union([z.record(z.unknown()), z.string().min(1)]).optional(),
    fileUrl: z.string().url().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().max(2000).optional(),
    isDefault: z.boolean().optional()
  }).refine((body) => Boolean(body.content) || Boolean(body.fileUrl), {
    message: "Either content or fileUrl is required"
  })
});

const uploadResumeSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    tags: z.string().optional(),
    description: z.string().max(2000).optional(),
    isDefault: z.enum(["true", "false"]).optional()
  })
});

const listResumeSchema = z.object({
  query: z.object({
    tags: z.string().optional(),
    sort: z.enum(["latest", "most_used"]).optional()
  })
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().length(24)
  })
});

const updateResumeSchema = z.object({
  params: z.object({
    id: z.string().length(24)
  }),
  body: z
    .object({
      name: z.string().min(1).optional(),
      content: z.union([z.record(z.unknown()), z.string()]).optional(),
      tags: z.array(z.string()).optional(),
      description: z.string().max(2000).optional()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required"
    })
});

export const resumeRouter = Router();

resumeRouter.use(authGuard);
resumeRouter.get("/", validate(listResumeSchema), listResumesController);
resumeRouter.get("/stats", getResumeStatsController);
resumeRouter.get("/compare", compareResumesController);
resumeRouter.post("/upload", upload.single("file"), validate(uploadResumeSchema), uploadResumeController);
resumeRouter.post("/", validate(createResumeSchema), createResumeController);
resumeRouter.get("/:id", validate(idParamSchema), getResumeByIdController);
resumeRouter.get("/:id/file-url", validate(idParamSchema), getResumeFileAccessUrlController);
resumeRouter.patch("/:id", validate(updateResumeSchema), updateResumeController);
resumeRouter.put("/:id/default", validate(idParamSchema), setDefaultResumeController);
resumeRouter.delete("/:id", validate(idParamSchema), deleteResumeController);
