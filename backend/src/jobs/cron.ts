import cron from "node-cron";
import { logger } from "../config/logger";
import { sendDuePlannerReminders } from "../modules/planner/services/notification.service";

export function startCronJobs() {
  cron.schedule("* * * * *", async () => {
    try {
      const result = await sendDuePlannerReminders();
      if (result.scanned > 0) {
        logger.info({ result }, "Planner reminder cron executed");
      }
    } catch (error) {
      logger.error({ error }, "Planner reminder cron failed");
    }
  });
}
