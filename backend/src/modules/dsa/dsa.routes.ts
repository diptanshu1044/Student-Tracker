import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import {
  listProblemsController,
  listUserProblemsController,
  trackProblemController
} from "./dsa.controller";

const trackProblemSchema = z.object({
  body: z.object({
    problemId: z.string().min(12),
    status: z.enum(["solved", "revise"]),
    attempts: z.number().int().min(1).optional(),
    lastSolvedAt: z.string().datetime().optional()
  })
});

export const dsaRouter = Router();

dsaRouter.get("/problems", listProblemsController);
dsaRouter.get("/user-problems", authGuard, listUserProblemsController);
dsaRouter.post("/user-problems", authGuard, validate(trackProblemSchema), trackProblemController);
