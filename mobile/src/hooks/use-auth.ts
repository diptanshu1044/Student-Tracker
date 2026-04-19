import { useAuthStore } from "@/src/store/auth-store";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    hydrated,
    isLoading,
    bootstrap,
    signIn,
    signUp,
    logout,
    isAuthenticated: Boolean(user),
  };
}
