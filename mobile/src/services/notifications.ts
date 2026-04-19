import { Platform } from "react-native";
import Constants from "expo-constants";

type PushRegistrationResult =
  | { ok: true; token: string | null }
  | { ok: false; reason: string };

type NotificationsModule = typeof import("expo-notifications");

const ANDROID_CHANNEL_ID = "planner-reminders";

/**
 * Remote / scheduled notifications are not available when `expo-notifications`
 * cannot be loaded (e.g. Expo Go on Android SDK 53+). Avoid top-level `import`
 * so the app bundle still runs in those environments.
 */
function expoGoAndroidBlocksNotifications(): boolean {
  return Platform.OS === "android" && Constants.appOwnership === "expo";
}

let cached: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (expoGoAndroidBlocksNotifications()) {
    return null;
  }
  if (Platform.OS === "web") {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-notifications") as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

let handlerInstalled = false;

function ensureNotificationHandler(Notifications: NotificationsModule) {
  if (handlerInstalled) {
    return;
  }
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Planner Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 250, 250, 250],
    enableLights: true,
    lightColor: "#0EA5E9",
  });
}

function getExpoProjectId(): string | null {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  return projectId ?? null;
}

async function requestPermissions(Notifications: NotificationsModule) {
  const existing = await Notifications.getPermissionsAsync();

  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return existing;
  }

  return Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: true,
    },
  });
}

export async function registerPushNotifications(): Promise<PushRegistrationResult> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return {
      ok: false,
      reason:
        Platform.OS === "android" && Constants.appOwnership === "expo"
          ? "Push notifications require a development build on Android (not supported in Expo Go)."
          : "Notifications are not available in this environment.",
    };
  }

  ensureNotificationHandler(Notifications);

  try {
    await ensureAndroidChannel(Notifications);
    const permission = await requestPermissions(Notifications);

    if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return {
        ok: false,
        reason: "Notification permission denied. Enable notifications in device settings.",
      };
    }

    const projectId = getExpoProjectId();
    if (!projectId) {
      return {
        ok: false,
        reason: "Expo projectId is missing. Configure EAS projectId to get push tokens.",
      };
    }

    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      return { ok: true, token: tokenResponse.data ?? null };
    } catch {
      return { ok: true, token: null };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unexpected notification setup error";
    return { ok: false, reason };
  }
}

export async function schedulePlannerReminder(input: {
  taskId: string;
  title: string;
  body: string;
  reminderTimeIso: string;
}) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return {
      ok: false,
      reason: "Local notifications require a development build on this device (Expo Go Android has no notification support).",
    } as const;
  }

  ensureNotificationHandler(Notifications);

  const reminderDate = new Date(input.reminderTimeIso);

  if (Number.isNaN(reminderDate.getTime())) {
    return { ok: false, reason: "Invalid reminder date" } as const;
  }

  const now = Date.now();
  const msUntilReminder = reminderDate.getTime() - now;

  if (msUntilReminder <= 0) {
    return { ok: false, reason: "Reminder time is in the past" } as const;
  }

  const registration = await registerPushNotifications();
  if (!registration.ok) {
    return registration;
  }

  await cancelPlannerReminder(input.taskId);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: {
        taskId: input.taskId,
        screen: "planner",
      },
      sound: "default",
    },
    trigger:
      Platform.OS === "android"
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
            channelId: ANDROID_CHANNEL_ID,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
          },
  });

  return { ok: true, identifier } as const;
}

export async function cancelPlannerReminder(taskId: string) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matches = scheduled.filter(
    (item) =>
      typeof item.content.data?.taskId === "string" && String(item.content.data.taskId) === taskId,
  );

  await Promise.all(matches.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}
