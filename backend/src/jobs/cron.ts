import cron from "node-cron";
import { logger } from "../config/logger";
import { sendDueJobReminders } from "./jobReminder.cron";
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

  cron.schedule("0 * * * *", async () => {
    try {
      const result = await sendDueJobReminders();
      if (result.scanned > 0) {
        logger.info({ result }, "Job reminder cron executed");
      }
    } catch (error) {
      logger.error({ error }, "Job reminder cron failed");
    }
  });
}
