import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

type PushRegistrationResult =
  | { ok: true; token: string | null }
  | { ok: false; reason: string };

const ANDROID_CHANNEL_ID = "planner-reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
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

async function requestPermissions() {
  const existing = await Notifications.getPermissionsAsync();

  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return existing;
  }

  return Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: true,
      allowAnnouncements: true,
    },
  });
}

export async function registerPushNotifications(): Promise<PushRegistrationResult> {
  try {
    await ensureAndroidChannel();
    const permission = await requestPermissions();

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
      // Token generation can fail on simulators or restricted environments.
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

  // Remove existing reminder for this task if present to avoid duplicate notifications.
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
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matches = scheduled.filter(
    (item) =>
      typeof item.content.data?.taskId === "string" &&
      String(item.content.data.taskId) === taskId,
  );

  await Promise.all(matches.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}
