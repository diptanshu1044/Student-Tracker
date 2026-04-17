import { Types } from "mongoose";
import { PlannerTaskModel } from "../../../models/planner-task.model";
import { UserModel } from "../../../models/user.model";
import { sendMail } from "../../../shared/utils/mailer";
import { logger } from "../../../config/logger";

export async function sendDuePlannerReminders(now = new Date()) {
  const dueTasks = await PlannerTaskModel.find({
    reminderTime: { $lte: now },
    notified: false,
    status: { $ne: "completed" }
  })
    .populate("profileId", "name")
    .lean();

  if (dueTasks.length === 0) {
    return { scanned: 0, notified: 0 };
  }

  const uniqueUserIds = Array.from(new Set(dueTasks.map((task) => task.userId.toString()))).map(
    (userId) => new Types.ObjectId(userId)
  );

  const users = await UserModel.find({ _id: { $in: uniqueUserIds } })
    .select("email name")
    .lean();

  const userById = new Map(users.map((user) => [user._id.toString(), user]));

  let notified = 0;

  for (const task of dueTasks) {
    const user = userById.get(task.userId.toString());

    if (!user) {
      continue;
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
  }

  return { scanned: dueTasks.length, notified };
}
