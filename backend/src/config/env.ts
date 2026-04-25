import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

function parseBooleanEnv(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return value;
}

function emptyStringToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  REDIS_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().default(60),
  EMAIL_VERIFICATION_MOCK: z.preprocess(parseBooleanEnv, z.boolean()).default(false),
  APPLICATION_DEADLINE_REMINDER_WINDOW_HOURS: z.coerce.number().int().positive().default(24),
  PLANNER_AUTO_CREATE_DEFAULT_PROFILE: z.preprocess(parseBooleanEnv, z.boolean()).default(true),
  PLANNER_DEFAULT_PROFILE_NAME: z.string().default("Study Planner"),
  PLANNER_DEFAULT_PROFILE_DESCRIPTION: z.string().default("Default planner profile for quick task capture"),
  PLANNER_DEFAULT_PROFILE_COLOR: z.string().default("#2563eb"),
  BREVO_SMTP_HOST: z.string().default("smtp-relay.brevo.com"),
  BREVO_SMTP_PORT: z.coerce.number().default(587),
  BREVO_SMTP_USER: z.string().optional(),
  BREVO_SMTP_PASS: z.string().optional(),
  BREVO_FROM: z.string().email().default("noreply@studentos.app"),
  EMAIL_DEBUG_KEY: z.preprocess(emptyStringToUndefined, z.string().min(8).optional()),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_ENDPOINT: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  S3_PUBLIC_BASE_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  S3_FORCE_PATH_STYLE: z.preprocess(parseBooleanEnv, z.boolean()).default(false),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  DATA_ENCRYPTION_KEY: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
