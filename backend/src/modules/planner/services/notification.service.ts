import { Types } from "mongoose";
import { PlannerTaskModel } from "../../../models/planner-task.model";
import { UserModel } from "../../../models/user.model";
import { sendMail } from "../../../shared/utils/mailer";
import { logger } from "../../../config/logger";

const MAX_PLANNER_REMINDERS_PER_RUN = 200;
const PLANNER_REMINDER_BATCH_SIZE = 20;

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<void>
) {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    await Promise.all(batch.map((item) => worker(item)));
  }
}

export async function sendDuePlannerReminders(now = new Date()) {
  const dueTasks = await PlannerTaskModel.find({
    reminderTime: { $lte: now },
    notified: false,
    status: { $ne: "completed" }
  })
    .sort({ reminderTime: 1 })
    .limit(MAX_PLANNER_REMINDERS_PER_RUN)
    .populate("profileId", "name")
    .lean();

  if (dueTasks.length === 0) {
    return { scanned: 0, notified: 0 };
  }

  const uniqueUserIds = Array.from(new Set(dueTasks.map((task) => task.userId.toString()))).map(
    (userId) => new Types.ObjectId(userId)
  );

  const users = await UserModel.find({ _id: { $in: uniqueUserIds } })
    .select("email name notificationPreferences")
    .lean();

  const userById = new Map(users.map((user) => [user._id.toString(), user]));

  let notified = 0;
  let skippedByPreferences = 0;

  await runInBatches(dueTasks, PLANNER_REMINDER_BATCH_SIZE, async (task) => {
    const user = userById.get(task.userId.toString());

    if (!user) {
      return;
    }

    const emailEnabled = user.notificationPreferences?.email ?? true;
    const plannerRemindersEnabled = user.notificationPreferences?.plannerReminders ?? true;

    if (!emailEnabled || !plannerRemindersEnabled) {
      await PlannerTaskModel.updateOne({ _id: task._id }, { $set: { notified: true } });
      skippedByPreferences += 1;
      return;
    }

    try {
      const profileName =
        typeof task.profileId === "object" && task.profileId && "name" in task.profileId
          ? (task.profileId.name as string)
          : "Planner";

      await sendMail({
        to: user.email,
        subject: `Reminder: ${task.title}`,
        text: `Hi ${user.name},\n\nThis is a reminder for your task "${task.title}" in ${profileName}.\nStart: ${task.startTime.toISOString()}\n\n- StudentOS`
      });

      await PlannerTaskModel.updateOne({ _id: task._id }, { $set: { notified: true } });
      notified += 1;
    } catch (error) {
      logger.error({ error, taskId: task._id.toString() }, "Failed to send planner reminder email");
    }
  });

  return {
    scanned: dueTasks.length,
    notified,
    skippedByPreferences,
    remainingPossibleBacklog: dueTasks.length === MAX_PLANNER_REMINDERS_PER_RUN
  };
}
