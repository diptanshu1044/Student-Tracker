import { Router } from "express";
import { authGuard } from "../../shared/middleware/auth";
import {
  streakController,
  topicBreakdownController,
  weakTopicsController,
  weeklySolvedController
} from "./analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.use(authGuard);
analyticsRouter.get("/weekly-solved", weeklySolvedController);
analyticsRouter.get("/topic-breakdown", topicBreakdownController);
analyticsRouter.get("/weak-topics", weakTopicsController);
analyticsRouter.get("/streak", streakController);
