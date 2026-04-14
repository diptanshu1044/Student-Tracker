import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import {
  activityController,
  createProblemLogController,
  deleteProblemLogController,
  listProblemCatalogController,
  listProblemsController,
  statsController,
  updateProblemLogController,
  weakTopicsController
} from "./dsa.controller";

const statusEnum = z.enum(["solved", "attempted", "revision", "revise"]);

const createProblemLogSchema = z.object({
  body: z.object({
    problemId: z.string().min(12),
    status: statusEnum,
    attempts: z.number().int().min(1).optional(),
    date: z.string().datetime().optional(),
    notes: z.string().max(1000).optional()
  })
});

const listProblemsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    topic: z.string().min(1).optional(),
    status: statusEnum.optional(),
    search: z.string().min(1).optional()
  })
});

const updateProblemLogSchema = z.object({
  params: z.object({
    id: z.string().min(12)
  }),
  body: z
    .object({
      status: statusEnum.optional(),
      attempts: z.number().int().min(1).optional(),
      date: z.string().datetime().optional(),
      notes: z.string().max(1000).optional()
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field must be provided"
    })
});

const deleteProblemLogSchema = z.object({
  params: z.object({
    id: z.string().min(12)
  })
});

export const dsaRouter = Router();

dsaRouter.get("/catalog", listProblemCatalogController);

dsaRouter.use(authGuard);
dsaRouter.get("/problems", validate(listProblemsSchema), listProblemsController);
dsaRouter.post("/problems", validate(createProblemLogSchema), createProblemLogController);
dsaRouter.get("/activity", activityController);
dsaRouter.get("/weak-topics", weakTopicsController);
dsaRouter.get("/stats", statsController);
dsaRouter.put("/:id", validate(updateProblemLogSchema), updateProblemLogController);
dsaRouter.delete("/:id", validate(deleteProblemLogSchema), deleteProblemLogController);
