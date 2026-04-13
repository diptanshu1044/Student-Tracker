import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import { completeTaskController, createTaskController, listTasksController } from "./planner.controller";

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    type: z.enum(["dsa", "job", "study"]),
    priority: z.enum(["low", "medium", "high"]),
    dueDate: z.string().datetime().optional()
  })
});

const completeTaskSchema = z.object({
  body: z.object({
    completed: z.boolean()
  }),
  params: z.object({
    taskId: z.string().min(12)
  })
});

export const plannerRouter = Router();

plannerRouter.use(authGuard);
plannerRouter.get("/tasks", listTasksController);
plannerRouter.post("/tasks", validate(createTaskSchema), createTaskController);
plannerRouter.patch("/tasks/:taskId/completed", validate(completeTaskSchema), completeTaskController);
