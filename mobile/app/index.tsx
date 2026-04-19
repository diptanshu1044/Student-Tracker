import { Redirect } from "expo-router";

import { LoadingState } from "@/src/components/ui/loading-state";
import { Screen } from "@/src/components/ui/screen";
import { useAuth } from "@/src/hooks/use-auth";

export default function IndexRoute() {
  const { hydrated, isAuthenticated } = useAuth();

  if (!hydrated) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(app)/(tabs)/dashboard" />;
}
