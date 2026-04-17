import { Router } from "express";
import { aiRouter } from "./ai/ai.routes";
import { analyticsRouter } from "./analytics/analytics.routes";
import { applicationsRouter } from "./applications/applications.routes";
import { authRouter } from "./auth/auth.routes";
import { dsaRouter } from "./dsa/dsa.routes";
import { jobsRouter } from "./jobs/jobs.routes";
import { plannerRouter } from "./planner/planner.routes";
import { resumeRouter } from "./resume/resume.routes";

export const apiV1Router = Router();

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/dsa", dsaRouter);
apiV1Router.use("/planner", plannerRouter);
apiV1Router.use("/applications", applicationsRouter);
apiV1Router.use("/jobs", jobsRouter);
apiV1Router.use("/resume", resumeRouter);
apiV1Router.use("/analytics", analyticsRouter);
apiV1Router.use("/ai", aiRouter);
