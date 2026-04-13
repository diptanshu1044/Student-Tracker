import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../config/logger";

export async function connectMongo(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production"
  });

  logger.info("MongoDB connected");
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
