import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { emailVerifiedGuard } from "../../shared/middleware/email-verified";
import { validate } from "../../shared/middleware/validate";
import {
  completeTaskController,
  createPlannerProfileController,
  createPlannerTaskController,
  createTaskController,
  deletePlannerProfileController,
  deletePlannerTaskController,
  googleCallbackController,
  googleConnectController,
  googleDisconnectController,
  googleSyncController,
  importPlannerTasksController,
  listAllPlannerTasksController,
  listPlannerProfilesController,
  listPlannerTasksByProfileController,
  listPlannerTasksController,
  listTasksController,
  markPlannerTaskStatusController,
  updatePlannerProfileController,
  updatePlannerTaskController
} from "./planner.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const prioritySchema = z.enum(["low", "medium", "high"]);
const statusSchema = z.enum(["pending", "completed", "missed"]);

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

const createProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#?[0-9A-Fa-f]{6}$/).optional()
  })
});

const updateProfileSchema = z.object({
  params: z.object({
    profileId: z.string().min(12)
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#?[0-9A-Fa-f]{6}$/).optional()
  })
});

const plannerTaskSchema = z.object({
  body: z.object({
    profileId: z.string().min(12),
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    priority: prioritySchema,
    status: statusSchema.optional(),
    reminderTime: z.string().datetime().optional()
  })
});

const updatePlannerTaskSchema = z.object({
  params: z.object({
    taskId: z.string().min(12)
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    reminderTime: z.string().datetime().optional()
  })
});

const markPlannerTaskStatusSchema = z.object({
  params: z.object({
    taskId: z.string().min(12)
  }),
  body: z.object({
    status: statusSchema
  })
});

const listPlannerTasksQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    profileId: z.string().min(12).optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
});

const profileParamSchema = z.object({
  params: z.object({
    profileId: z.string().min(12)
  })
});

const googleSyncSchema = z.object({
  body: z.object({
    profileId: z.string().min(12).optional()
  })
});

export const plannerRouter = Router();

plannerRouter.get("/google/callback", googleCallbackController);
plannerRouter.use(authGuard);
plannerRouter.use(emailVerifiedGuard);

plannerRouter.get("/profiles", listPlannerProfilesController);
plannerRouter.post("/profiles", validate(createProfileSchema), createPlannerProfileController);
plannerRouter.patch("/profiles/:profileId", validate(updateProfileSchema), updatePlannerProfileController);
plannerRouter.delete("/profiles/:profileId", validate(profileParamSchema), deletePlannerProfileController);

plannerRouter.get("/all", validate(listPlannerTasksQuerySchema), listAllPlannerTasksController);
plannerRouter.get(
  "/profile/:profileId",
  validate(profileParamSchema.merge(listPlannerTasksQuerySchema)),
  listPlannerTasksByProfileController
);
plannerRouter.get("/tasks-v2", validate(listPlannerTasksQuerySchema), listPlannerTasksController);
plannerRouter.post("/tasks-v2", validate(plannerTaskSchema), createPlannerTaskController);
plannerRouter.patch("/tasks-v2/:taskId", validate(updatePlannerTaskSchema), updatePlannerTaskController);
plannerRouter.delete("/tasks-v2/:taskId", validate(markPlannerTaskStatusSchema.pick({ params: true })), deletePlannerTaskController);
plannerRouter.patch(
  "/tasks-v2/:taskId/status",
  validate(markPlannerTaskStatusSchema),
  markPlannerTaskStatusController
);

plannerRouter.post(
  "/import",
  upload.single("file"),
  validate(
    z.object({
      body: z.object({
        profileId: z.string().min(12)
      })
    })
  ),
  importPlannerTasksController
);

plannerRouter.get("/google/connect", googleConnectController);
plannerRouter.post("/google/disconnect", googleDisconnectController);
plannerRouter.post("/google/sync", validate(googleSyncSchema), googleSyncController);

plannerRouter.get("/tasks", listTasksController);
plannerRouter.post("/tasks", validate(createTaskSchema), createTaskController);
plannerRouter.patch("/tasks/:taskId/completed", validate(completeTaskSchema), completeTaskController);
