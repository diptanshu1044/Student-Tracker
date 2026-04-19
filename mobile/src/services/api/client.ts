import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { appConfig } from "@/src/utils/config";
import { clearAuthSession, getRefreshToken } from "@/src/services/storage";
import { type ApiEnvelope, type AuthTokens } from "@/src/types/api";

let accessTokenProvider: (() => Promise<string | null>) | null = null;
let onUnauthorized: (() => Promise<void> | void) | null = null;
let onTokenRefresh: ((tokens: AuthTokens) => Promise<void> | void) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function configureApiClient(input: {
  getAccessToken: () => Promise<string | null>;
  onUnauthorized: () => Promise<void> | void;
  onTokenRefresh: (tokens: AuthTokens) => Promise<void> | void;
}) {
  accessTokenProvider = input.getAccessToken;
  onUnauthorized = input.onUnauthorized;
  onTokenRefresh = input.onTokenRefresh;
}

const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15000,
});

const refreshClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15000,
});

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await refreshClient.post<ApiEnvelope<AuthTokens>>("/auth/refresh", {
        refreshToken,
      });
      const tokens = response.data.data;
      if (!tokens) {
        return null;
      }

      await onTokenRefresh?.(tokens);

      return tokens.accessToken;
    } catch {
      await clearAuthSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

api.interceptors.request.use(async (config) => {
  if (!accessTokenProvider) {
    return config;
  }

  const token = await accessTokenProvider();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const config = error.config as RetryableConfig | undefined;

    if (!config || error.response?.status !== 401 || config._retry) {
      return Promise.reject(error);
    }

    config._retry = true;
    const refreshedToken = await refreshAccessToken();

    if (!refreshedToken) {
      await onUnauthorized?.();
      return Promise.reject(error);
    }

    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${refreshedToken}`;

    return api.request(config as AxiosRequestConfig);
  },
);

export { api };
