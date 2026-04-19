import { StyleSheet, Text } from "react-native";

import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { LoadingState } from "@/src/components/ui/loading-state";
import { Screen } from "@/src/components/ui/screen";
import { useDashboardSummary } from "@/src/hooks/use-mobile-features";
import { getApiErrorMessage } from "@/src/services/api";
import { theme } from "@/src/utils/theme";

export function DashboardScreen() {
  const query = useDashboardSummary();

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen>
        <EmptyState title="Unable to load dashboard" description={getApiErrorMessage(query.error)} />
      </Screen>
    );
  }

  const data = query.data;

  return (
    <Screen>
      <Text style={styles.title}>Dashboard</Text>
      {data?.dsa ? (
        <Card title="DSA Progress">
          <Text style={styles.metric}>Solved: {data.dsa.totalSolved}</Text>
          <Text style={styles.metric}>Attempted: {data.dsa.totalAttempted}</Text>
          <Text style={styles.metric}>Current streak: {data.dsa.currentStreak}</Text>
        </Card>
      ) : null}

      {data?.jobs ? (
        <Card title="Jobs Progress">
          <Text style={styles.metric}>Total applications: {data.jobs.totalApplications}</Text>
          <Text style={styles.metric}>Interviews: {data.jobs.interviews}</Text>
          <Text style={styles.metric}>Offers: {data.jobs.offers}</Text>
        </Card>
      ) : null}

      {data?.funnel ? (
        <Card title="Job Funnel">
          <Text style={styles.metric}>Applied: {data.funnel.applied}</Text>
          <Text style={styles.metric}>OA: {data.funnel.oa}</Text>
          <Text style={styles.metric}>Interview: {data.funnel.interview}</Text>
          <Text style={styles.metric}>Offer: {data.funnel.offer}</Text>
        </Card>
      ) : null}

      {data?.resumeStats ? (
        <Card title="Resume Stats">
          <Text style={styles.metric}>Resumes tracked: {data.resumeStats.length}</Text>
          <Text style={styles.metric}>
            Total uses: {data.resumeStats.reduce((sum, resume) => sum + resume.totalUsed, 0)}
          </Text>
        </Card>
      ) : null}

      {data?.weakTopics?.length ? (
        <Card title="Weak Topics">
          {data.weakTopics.slice(0, 5).map((topic) => (
            <Text key={topic.topic} style={styles.metric}>
              {topic.topic}: {Math.round(topic.score)}
            </Text>
          ))}
        </Card>
      ) : null}

      {!data?.dsa && !data?.jobs && !data?.resumeStats ? (
        <EmptyState title="No dashboard data" description="Dashboard cards appear when backend sources return data." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  metric: {
    color: theme.colors.text,
  },
});
