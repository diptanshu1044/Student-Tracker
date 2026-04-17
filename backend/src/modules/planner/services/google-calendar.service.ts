import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { env } from "../../../config/env";
import { PlannerTaskModel } from "../../../models/planner-task.model";
import { UserModel } from "../../../models/user.model";
import { AppError } from "../../../shared/utils/app-error";
import { decryptJson, encryptJson } from "../../../shared/utils/crypto";

interface GoogleStateToken {
  userId: string;
}

interface StoredGoogleTokens {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

function getOAuthClient() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new AppError(
      "Google Calendar integration is not configured",
      StatusCodes.NOT_IMPLEMENTED
    );
  }

  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

function signGoogleState(payload: GoogleStateToken) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: "10m" });
}

function verifyGoogleState(state: string): GoogleStateToken {
  try {
    return jwt.verify(state, env.JWT_ACCESS_SECRET) as GoogleStateToken;
  } catch {
    throw new AppError("Invalid or expired Google OAuth state", StatusCodes.BAD_REQUEST);
  }
}

export function getGoogleConnectUrl(userId: string) {
  const oauthClient = getOAuthClient();
  const state = signGoogleState({ userId });

  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state
  });

  return { url };
}

export async function disconnectGoogleCalendar(userId: string) {
  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      googleCalendarConnected: false
    },
    $unset: {
      googleTokens: 1
    }
  });

  return { disconnected: true as const };
}

export async function handleGoogleCallback(code: string, state: string) {
  const oauthClient = getOAuthClient();
  const parsedState = verifyGoogleState(state);

  const { tokens } = await oauthClient.getToken(code);

  await UserModel.findByIdAndUpdate(parsedState.userId, {
    $set: {
      googleCalendarConnected: true,
      googleTokens: encryptJson(tokens as Record<string, unknown>)
    }
  });

  return { connected: true };
}

async function getCalendarClientForUser(userId: string) {
  const user = await UserModel.findById(userId).select("googleCalendarConnected googleTokens");

  if (!user?.googleCalendarConnected || !user.googleTokens) {
    return null;
  }

  const oauthClient = getOAuthClient();
  const tokens = decryptJson<StoredGoogleTokens>(user.googleTokens);
  oauthClient.setCredentials(tokens);

  return google.calendar({ version: "v3", auth: oauthClient });
}

export async function syncTaskToGoogleCalendar(taskId: string) {
  const task = await PlannerTaskModel.findById(taskId)
    .populate("profileId", "name")
    .lean();

  if (!task) {
    throw new AppError("Task not found", StatusCodes.NOT_FOUND);
  }

  const calendar = await getCalendarClientForUser(task.userId.toString());

  if (!calendar) {
    return { synced: false, reason: "google_not_connected" as const };
  }

  const event = {
    summary: task.title,
    description: [
      task.description ?? "",
      typeof task.profileId === "object" && task.profileId && "name" in task.profileId
        ? `Profile: ${task.profileId.name}`
        : ""
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: task.startTime.toISOString() },
    end: { dateTime: task.endTime.toISOString() },
    reminders: task.reminderTime
      ? {
          useDefault: false,
          overrides: [
            {
              method: "email",
              minutes: Math.max(
                0,
                Math.round((task.startTime.getTime() - task.reminderTime.getTime()) / 60000)
              )
            }
          ]
        }
      : undefined
  };

  if (task.googleEventId) {
    await calendar.events.update({
      calendarId: "primary",
      eventId: task.googleEventId,
      requestBody: event
    });

    return { synced: true, mode: "updated" as const };
  }

  const inserted = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event
  });

  await PlannerTaskModel.updateOne(
    { _id: task._id },
    {
      $set: {
        googleEventId: inserted.data.id,
        source: task.source === "manual" ? "google" : task.source
      }
    }
  );

  return { synced: true, mode: "created" as const };
}

export async function syncTasksToGoogleCalendar(input: { userId: string; profileId?: string }) {
  const user = await UserModel.findById(input.userId).select("googleCalendarConnected googleTokens").lean();

  if (!user?.googleCalendarConnected || !user.googleTokens) {
    throw new AppError("Connect Google Calendar first", StatusCodes.BAD_REQUEST);
  }

  const query: Record<string, unknown> = {
    userId: input.userId,
    status: { $ne: "completed" }
  };

  if (input.profileId) {
    query.profileId = input.profileId;
  }

  const tasks = await PlannerTaskModel.find(query).select("_id").lean();

  let syncedCount = 0;

  for (const task of tasks) {
    const result = await syncTaskToGoogleCalendar(task._id.toString());
    if (result.synced) {
      syncedCount += 1;
    }
  }

  return {
    total: tasks.length,
    syncedCount
  };
}
