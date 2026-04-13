import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import { generateRoadmapController } from "./ai.controller";

const roadmapSchema = z.object({
  body: z.object({
    goal: z.string().min(10)
  })
});

export const aiRouter = Router();

aiRouter.use(authGuard);
aiRouter.post("/roadmap", validate(roadmapSchema), generateRoadmapController);
