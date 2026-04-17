import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectMongo } from "./database/mongodb";
import { connectRedis } from "./database/redis";
import { startCronJobs } from "./jobs/cron";
import { app } from "./app";

async function bootstrap() {
  await Promise.all([connectMongo(), connectRedis()]);
  startCronJobs();

  app.listen(env.PORT, () => {
    logger.info(`StudentOS backend listening on port ${env.PORT}`);
  });
}

void bootstrap();
