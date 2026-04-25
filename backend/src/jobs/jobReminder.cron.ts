import { Types } from "mongoose";
import { env } from "../config/env";
import { JobApplicationModel } from "../models/job-application.model";
import { ApplicationModel } from "../models/application.model";
import { UserModel } from "../models/user.model";
import { sendMail } from "../shared/utils/mailer";
import { logger } from "../config/logger";

const MAX_JOB_REMINDERS_PER_TYPE_PER_RUN = 200;
const JOB_REMINDER_BATCH_SIZE = 20;

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

export async function sendDueJobReminders(now = new Date()) {
  const followUpDue = await JobApplicationModel.find({
    followUpDate: { $lte: now },
    followUpNotified: false,
    status: { $nin: ["offer", "rejected"] }
  })
    .sort({ followUpDate: 1 })
    .limit(MAX_JOB_REMINDERS_PER_TYPE_PER_RUN)
    .lean();

  const interviewWindowEnd = new Date(now.getTime() + 60 * 60 * 1000);
  const interviewDue = await JobApplicationModel.find({
    interviewDate: { $gte: now, $lte: interviewWindowEnd },
    interviewNotified: false,
    status: { $nin: ["offer", "rejected"] }
  })
    .sort({ interviewDate: 1 })
    .limit(MAX_JOB_REMINDERS_PER_TYPE_PER_RUN)
    .lean();

  const applicationDeadlineWindowEnd = new Date(
    now.getTime() + env.APPLICATION_DEADLINE_REMINDER_WINDOW_HOURS * 60 * 60 * 1000
  );

  const applicationDeadlinesDue = await ApplicationModel.find({
    status: "to_apply",
    lastDateToApply: { $gte: now, $lte: applicationDeadlineWindowEnd },
    lastDateToApplyNotified: { $ne: true }
  })
    .sort({ lastDateToApply: 1 })
    .limit(MAX_JOB_REMINDERS_PER_TYPE_PER_RUN)
    .lean();

  const dueApplications = [...followUpDue, ...interviewDue];
  const totalScanned = dueApplications.length + applicationDeadlinesDue.length;

  if (totalScanned === 0) {
    return {
      scanned: 0,
      followUpNotified: 0,
      interviewNotified: 0,
      applicationDeadlineNotified: 0,
      mockMode: env.EMAIL_VERIFICATION_MOCK
    };
  }

  if (env.EMAIL_VERIFICATION_MOCK) {
    logger.info({ totalScanned }, "Skipping reminder emails because EMAIL_VERIFICATION_MOCK is enabled");
    return {
      scanned: totalScanned,
      followUpNotified: 0,
      interviewNotified: 0,
      applicationDeadlineNotified: 0,
      mockMode: true
    };
  }

  const uniqueUserIds = Array.from(
    new Set([
      ...dueApplications.map((app) => app.userId.toString()),
      ...applicationDeadlinesDue.map((app) => app.userId.toString())
    ])
  ).map((userId) => new Types.ObjectId(userId));

  const users = await UserModel.find({ _id: { $in: uniqueUserIds } }).select("email name").lean();
  const userById = new Map(users.map((user) => [user._id.toString(), user]));

  let followUpNotifiedCount = 0;
  let interviewNotifiedCount = 0;
  let applicationDeadlineNotifiedCount = 0;

  await runInBatches(followUpDue, JOB_REMINDER_BATCH_SIZE, async (application) => {
    const user = userById.get(application.userId.toString());
    if (!user) {
      return;
    }

    try {
      await sendMail({
        to: user.email,
        subject: `Follow-up reminder: ${application.companyName} - ${application.role}`,
        text: `Hi ${user.name},\n\nFollow up with ${application.companyName} for the ${application.role} role.\n\n- StudentOS`
      });

      await JobApplicationModel.updateOne(
        { _id: application._id },
        { $set: { followUpNotified: true, lastUpdated: new Date() } }
      );

      followUpNotifiedCount += 1;
    } catch (error) {
      logger.error({ error, applicationId: application._id.toString() }, "Job follow-up reminder failed");
    }
  });

  await runInBatches(interviewDue, JOB_REMINDER_BATCH_SIZE, async (application) => {
    const user = userById.get(application.userId.toString());
    if (!user) {
      return;
    }

    try {
      await sendMail({
        to: user.email,
        subject: `Interview reminder: ${application.companyName} - ${application.role}`,
        text: `Hi ${user.name},\n\nYou have an interview reminder for ${application.companyName} (${application.role}).\nInterview time: ${application.interviewDate?.toISOString()}\n\n- StudentOS`
      });

      await JobApplicationModel.updateOne(
        { _id: application._id },
        { $set: { interviewNotified: true, lastUpdated: new Date() } }
      );

      interviewNotifiedCount += 1;
    } catch (error) {
      logger.error({ error, applicationId: application._id.toString() }, "Job interview reminder failed");
    }
  });

  await runInBatches(applicationDeadlinesDue, JOB_REMINDER_BATCH_SIZE, async (application) => {
    const user = userById.get(application.userId.toString());
    if (!user) {
      return;
    }

    try {
      await sendMail({
        to: user.email,
        subject: `Application deadline reminder: ${application.company} - ${application.role}`,
        text: `Hi ${user.name},\n\nThe application deadline for ${application.company} (${application.role}) is approaching.\nLast date to apply: ${application.lastDateToApply?.toISOString()}\n\nPlease apply before it closes.\n\n- StudentOS`
      });

      await ApplicationModel.updateOne(
        { _id: application._id },
        { $set: { lastDateToApplyNotified: true, updatedAt: new Date() } }
      );

      applicationDeadlineNotifiedCount += 1;
    } catch (error) {
      logger.error(
        { error, applicationId: application._id.toString() },
        "Application deadline reminder failed"
      );
    }
  });

  return {
    scanned: totalScanned,
    followUpNotified: followUpNotifiedCount,
    interviewNotified: interviewNotifiedCount,
    applicationDeadlineNotified: applicationDeadlineNotifiedCount,
    mockMode: false,
    remainingPossibleBacklog:
      followUpDue.length === MAX_JOB_REMINDERS_PER_TYPE_PER_RUN ||
      interviewDue.length === MAX_JOB_REMINDERS_PER_TYPE_PER_RUN ||
      applicationDeadlinesDue.length === MAX_JOB_REMINDERS_PER_TYPE_PER_RUN
  };
}
