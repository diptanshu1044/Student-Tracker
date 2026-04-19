import * as SecureStore from "expo-secure-store";

import { type AuthUser } from "@/src/types/api";

const ACCESS_TOKEN_KEY = "studentos_access_token";
const REFRESH_TOKEN_KEY = "studentos_refresh_token";
const USER_KEY = "studentos_auth_user";

async function setItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  await SecureStore.deleteItemAsync(key);
}

export async function persistAuthSession(input: {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}) {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, input.accessToken),
    setItem(REFRESH_TOKEN_KEY, input.refreshToken),
    setItem(USER_KEY, JSON.stringify(input.user)),
  ]);
}

export async function getAccessToken() {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function getStoredUser() {
  const value = await getItem(USER_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}

export async function clearAuthSession() {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(USER_KEY),
  ]);
}
