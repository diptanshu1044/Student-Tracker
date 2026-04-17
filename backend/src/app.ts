import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { apiV1Router } from "./modules";
import { googleCallbackController } from "./modules/planner/planner.controller";
import { errorHandler } from "./shared/middleware/error-handler";
import { notFoundHandler } from "./shared/middleware/not-found";
import { apiRateLimiter } from "./shared/middleware/rate-limit";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));
app.use(pinoHttp({ logger }));
app.use(apiRateLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: { status: "ok" },
    error: null
  });
});

// Keep backward compatibility with existing OAuth redirect URI values.
app.get("/auth/google/callback", googleCallbackController);

app.use("/api/v1", apiV1Router);

app.use(notFoundHandler);
app.use(errorHandler);
