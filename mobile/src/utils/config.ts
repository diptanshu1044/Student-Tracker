import Constants from "expo-constants";

function resolveFallbackBaseUrl(): string {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri ??
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  const host = hostUri?.split(":")[0];
  if (host) {
    // Use the dev machine host so physical devices on Expo Go can reach the backend.
    return `http://${host}:8080/api/v1`;
  }

  return "http://localhost:8080/api/v1";
}

const fallbackBaseUrl = resolveFallbackBaseUrl();

export const appConfig = {
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackBaseUrl).replace(/\/$/, ""),
};
