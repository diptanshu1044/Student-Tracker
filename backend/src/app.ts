import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { apiV1Router } from "./modules";
import { googleCallbackController } from "./modules/planner/planner.controller";
import { errorHandler } from "./shared/middleware/error-handler";
import { notFoundHandler } from "./shared/middleware/not-found";
import { apiRateLimiter } from "./shared/middleware/rate-limit";
import { sendMail } from "./shared/utils/mailer";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/health"
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} -> ${res.statusCode}`,
    customErrorMessage: (req, res, error) =>
      `${req.method} ${req.url} -> ${res.statusCode ?? 500} (${error.message})`,
    customProps: (req, res) => ({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTimeMs: res.getHeader("x-response-time")
    }),
    serializers: {
      req: () => undefined,
      res: () => undefined
    }
  })
);
app.use(apiRateLimiter);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: { status: "ok" },
    error: null
  });
});

app.get("/health/email", async (req, res) => {
  if (env.NODE_ENV !== "development") {
    res.status(404).json({
      success: false,
      data: null,
      error: {
        message: "Not found"
      }
    });
    return;
  }

  if (!env.EMAIL_DEBUG_KEY) {
    res.status(503).json({
      success: false,
      data: null,
      error: {
        message: "EMAIL_DEBUG_KEY is not configured"
      }
    });
    return;
  }

  const suppliedKey = (req.header("x-email-debug-key") ?? req.query.key)?.toString().trim();
  if (!suppliedKey || suppliedKey !== env.EMAIL_DEBUG_KEY) {
    res.status(401).json({
      success: false,
      data: null,
      error: {
        message: "Unauthorized"
      }
    });
    return;
  }

  const destination =
    (typeof req.query.to === "string" ? req.query.to.trim() : "") ||
    env.BREVO_SMTP_USER ||
    "";

  if (!destination) {
    res.status(400).json({
      success: false,
      data: null,
      error: {
        message: "Provide a recipient via query param 'to' or configure BREVO_SMTP_USER"
      }
    });
    return;
  }

  try {
    const diagnostics = await sendMail({
      to: destination,
      subject: `StudentOS email health check (${new Date().toISOString()})`,
      text: "This is a diagnostic email from /health/email."
    });

    res.status(200).json({
      success: true,
      data: {
        sent: true,
        to: destination,
        diagnostics
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: {
        message: error instanceof Error ? error.message : "Failed to send diagnostic email"
      }
    });
  }
});

// Keep backward compatibility with existing OAuth redirect URI values.
app.get("/auth/google/callback", googleCallbackController);

app.use("/api/v1", apiV1Router);

app.use(notFoundHandler);
app.use(errorHandler);
