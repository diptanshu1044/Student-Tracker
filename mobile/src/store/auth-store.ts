import { create } from "zustand";

import { configureApiClient } from "@/src/services/api/client";
import { clearAuthSession, getAccessToken, getStoredUser, persistAuthSession } from "@/src/services/storage";
import { getMe, login, register } from "@/src/services/api";
import { type AuthUser } from "@/src/types/api";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;
  isLoading: boolean;
  bootstrap: () => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  hydrated: false,
  isLoading: false,
  bootstrap: async () => {
    set({ isLoading: true });

    try {
      const [token, storedUser] = await Promise.all([getAccessToken(), getStoredUser()]);
      if (!token) {
        set({ user: null, accessToken: null, hydrated: true, isLoading: false });
        return;
      }

      set({ accessToken: token, user: storedUser });
      const me = await getMe();
      set({ user: me, hydrated: true, isLoading: false });
    } catch {
      await clearAuthSession();
      set({ user: null, accessToken: null, hydrated: true, isLoading: false });
    }
  },
  signIn: async (input) => {
    set({ isLoading: true });
    try {
      const payload = await login(input);
      await persistAuthSession({
        accessToken: payload.tokens.accessToken,
        refreshToken: payload.tokens.refreshToken,
        user: payload.user,
      });
      set({ user: payload.user, accessToken: payload.tokens.accessToken, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  signUp: async (input) => {
    set({ isLoading: true });
    try {
      const payload = await register(input);
      await persistAuthSession({
        accessToken: payload.tokens.accessToken,
        refreshToken: payload.tokens.refreshToken,
        user: payload.user,
      });
      set({ user: payload.user, accessToken: payload.tokens.accessToken, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  logout: async () => {
    await clearAuthSession();
    set({ user: null, accessToken: null });
  },
}));

configureApiClient({
  getAccessToken: async () => useAuthStore.getState().accessToken ?? (await getAccessToken()),
  onUnauthorized: async () => {
    await useAuthStore.getState().logout();
  },
  onTokenRefresh: async (tokens) => {
    const state = useAuthStore.getState();
    if (!state.user) {
      return;
    }

    await persistAuthSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: state.user,
    });
    useAuthStore.setState({ accessToken: tokens.accessToken });
  },
});
