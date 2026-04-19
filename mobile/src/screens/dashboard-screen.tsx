import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Screen } from "@/src/components/ui/screen";
import { useAuth } from "@/src/hooks/use-auth";
import {
  getApiErrorMessage,
  getStreak,
  getTasks,
  getTopicBreakdown,
  getUserProblems,
  getWeeklySolved,
} from "@/src/services/api";
import { theme } from "@/src/utils/theme";

const TOPIC_COLORS = [
  theme.colors.chart1,
  theme.colors.chart2,
  theme.colors.chart3,
  theme.colors.chart4,
  theme.colors.chart5,
];

const CHART_INNER_HEIGHT = 112;

export function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.name?.trim() || "there";

  const streakQuery = useQuery({ queryKey: ["streak"], queryFn: getStreak });
  const problemsQuery = useQuery({
    queryKey: ["dashboard", "user-problems", "solved"],
    queryFn: () => getUserProblems({ page: 1, limit: 500, status: "solved" }),
  });
  const tasksQuery = useQuery({
    queryKey: ["dashboard", "tasks"],
    queryFn: () => getTasks({ page: 1, limit: 300 }),
  });
  const weeklyQuery = useQuery({ queryKey: ["weekly-solved"], queryFn: getWeeklySolved });
  const topicsQuery = useQuery({ queryKey: ["topic-breakdown"], queryFn: getTopicBreakdown });

  const problemStats = useMemo(() => {
    const items = problemsQuery.data?.items ?? [];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let todayCount = 0;
    let weekCount = 0;
    for (const item of items) {
      const date = new Date(item.createdAt);
      if (date.toDateString() === now.toDateString()) {
        todayCount += 1;
      }
      if (date >= startOfWeek) {
        weekCount += 1;
      }
    }
    return { total: problemsQuery.data?.total ?? 0, today: todayCount, thisWeek: weekCount };
  }, [problemsQuery.data]);

  const taskStats = useMemo(() => {
    const tasks = tasksQuery.data?.items ?? [];
    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [tasksQuery.data]);

  const weeklyData = useMemo(() => {
    const points = weeklyQuery.data ?? [];
    return points.slice(-8).map((point) => ({
      label: `W${point.week}`,
      problems: point.solvedCount,
    }));
  }, [weeklyQuery.data]);

  const weeklyMax = useMemo(() => Math.max(...weeklyData.map((d) => d.problems), 1), [weeklyData]);

  const topicData = useMemo(() => {
    const points = topicsQuery.data ?? [];
    const total = points.reduce((sum, p) => sum + p.solvedCount, 0);
    return points.map((item, index) => ({
      name: item.topic,
      value: item.solvedCount,
      color: TOPIC_COLORS[index % TOPIC_COLORS.length],
      pct: total > 0 ? Math.round((item.solvedCount / total) * 100) : 0,
    }));
  }, [topicsQuery.data]);

  const streakCount = streakQuery.data?.currentStreak ?? 0;

  const hasSectionError =
    streakQuery.isError || problemsQuery.isError || tasksQuery.isError || weeklyQuery.isError || topicsQuery.isError;

  const firstError =
    streakQuery.error ?? problemsQuery.error ?? tasksQuery.error ?? weeklyQuery.error ?? topicsQuery.error;

  return (
    <Screen appChrome>
      <View style={styles.headerBlock}>
        <Text style={styles.pageTitle}>Welcome back, {displayName}</Text>
        <Text style={styles.pageSubtitle}>Here's your progress overview for today.</Text>
      </View>

      <View style={styles.quickRow}>
        <Button
          label="Log Problem"
          variant="primary"
          onPress={() => router.push("/(app)/(tabs)/dsa-tracker")}
        />
        <Button
          label="Start Session"
          variant="secondary"
          onPress={() => router.push("/(app)/(tabs)/planner")}
        />
        <Button
          label="Edit Resume"
          variant="outline"
          onPress={() => router.push("/(app)/(tabs)/resume")}
        />
        <Button
          label="Add Application"
          variant="outline"
          onPress={() => router.push("/(app)/(tabs)/applications")}
        />
      </View>

      {hasSectionError ? (
        <EmptyState title="Some data could not load" description={getApiErrorMessage(firstError)} />
      ) : null}

      {/* Streak — matches web StreakCard */}
      <Card variant="highlight">
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={styles.cardEyebrow}>Current Streak</Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakNumber}>{streakQuery.isLoading ? "—" : streakCount}</Text>
              <Text style={styles.streakUnit}>days</Text>
            </View>
            <Text style={styles.cardHint}>Keep your streak alive today</Text>
          </View>
          <View style={styles.iconBubblePrimary}>
            {streakQuery.isLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Ionicons name="flame" size={28} color={theme.colors.primary} />
            )}
          </View>
        </View>
        <View style={styles.dotsRow}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < Math.min(streakCount, 7) ? styles.dotOn : styles.dotOff,
              ]}
            />
          ))}
        </View>
        <Text style={styles.dotCaption}>
          {Math.min(streakCount, 7)} of 7 days completed this week
        </Text>
      </Card>

      {/* Problems — matches web ProblemsCard */}
      <Card>
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={styles.cardEyebrow}>Problems Solved</Text>
            <View style={styles.streakRow}>
              <Text style={styles.bigNumber}>
                {problemsQuery.isLoading ? "—" : problemStats.total}
              </Text>
              <Text style={styles.streakUnit}>total</Text>
            </View>
          </View>
          <View style={[styles.iconBubble, { backgroundColor: `${theme.colors.chart2}22` }]}>
            {problemsQuery.isLoading ? (
              <ActivityIndicator color={theme.colors.chart2} />
            ) : (
              <Ionicons name="code-slash" size={26} color={theme.colors.chart2} />
            )}
          </View>
        </View>
        <View style={styles.twoCol}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>{problemsQuery.isLoading ? "—" : problemStats.today}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>This Week</Text>
            <View style={styles.weekRow}>
              <Text style={styles.statValue}>{problemsQuery.isLoading ? "—" : problemStats.thisWeek}</Text>
              <View style={styles.livePill}>
                <Ionicons name="trending-up" size={12} color={theme.colors.chart3} />
                <Text style={styles.liveText}>live</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* Tasks — matches web TasksCard */}
      <Card>
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={styles.cardEyebrow}>Tasks Overview</Text>
            <View style={styles.streakRow}>
              <Text style={styles.bigNumber}>{tasksQuery.isLoading ? "—" : taskStats.completed}</Text>
              <Text style={styles.streakUnit}>/ {tasksQuery.isLoading ? "—" : taskStats.total}</Text>
            </View>
          </View>
          <View style={[styles.iconBubble, { backgroundColor: `${theme.colors.chart4}22` }]}>
            {tasksQuery.isLoading ? (
              <ActivityIndicator color={theme.colors.chart4} />
            ) : (
              <Ionicons name="list" size={26} color={theme.colors.chart4} />
            )}
          </View>
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.mutedSmall}>Progress</Text>
          <Text style={styles.mutedSmallBold}>{tasksQuery.isLoading ? "—" : `${taskStats.percentage}%`}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: taskStats.percentage || 0 }]} />
          <View style={{ flex: Math.max(0, 100 - taskStats.percentage) }} />
        </View>
        <View style={styles.taskFooter}>
          <View style={styles.taskFooterItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.chart3} />
            <Text style={styles.mutedSmall}>{taskStats.completed} done</Text>
          </View>
          <View style={styles.taskFooterItem}>
            <Ionicons name="ellipse-outline" size={16} color={theme.colors.mutedText} />
            <Text style={styles.mutedSmall}>{taskStats.total - taskStats.completed} pending</Text>
          </View>
        </View>
      </Card>

      {/* Weekly Activity — matches web chart (simplified bars) */}
      <Card title="Weekly Activity">
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.mutedSmall}>Problems</Text>
          </View>
        </View>
        <View style={styles.chartArea}>
          {weeklyQuery.isLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 24 }} />
          ) : weeklyData.length === 0 ? (
            <Text style={styles.mutedSmall}>No weekly activity yet.</Text>
          ) : (
            <View style={styles.barRow}>
              {weeklyData.map((d) => {
                const h = Math.max(4, (d.problems / weeklyMax) * CHART_INNER_HEIGHT);
                return (
                  <View key={d.label} style={styles.barCol}>
                    <View style={styles.barStack}>
                      <View
                        style={[
                          styles.barFillSolid,
                          { height: h, backgroundColor: theme.colors.primary },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </Card>

      {/* Topic distribution — list + simple ring using rows */}
      <Card title="Topic Distribution">
        {topicsQuery.isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
        ) : topicData.length === 0 ? (
          <Text style={styles.mutedSmall}>No topic data yet.</Text>
        ) : (
          <View style={styles.topicList}>
            {topicData.map((item) => (
              <View key={item.name} style={styles.topicRow}>
                <View style={styles.topicLeft}>
                  <View style={[styles.topicDot, { backgroundColor: item.color }]} />
                  <Text style={styles.topicName}>{item.name}</Text>
                </View>
                <Text style={styles.topicValue}>
                  {item.value} ({item.pct}%)
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: 6,
  },
  pageTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    color: theme.colors.mutedText,
    fontSize: 15,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTopLeft: {
    flex: 1,
    gap: 4,
  },
  cardEyebrow: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.mutedText,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  streakNumber: {
    fontSize: 40,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  bigNumber: {
    fontSize: 40,
    fontWeight: "700",
    color: theme.colors.text,
  },
  streakUnit: {
    fontSize: 18,
    color: theme.colors.mutedText,
  },
  cardHint: {
    fontSize: 12,
    color: theme.colors.mutedText,
  },
  iconBubblePrimary: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${theme.colors.primary}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: theme.spacing.md,
  },
  dot: {
    height: 8,
    flex: 1,
    borderRadius: 999,
  },
  dotOn: {
    backgroundColor: theme.colors.primary,
  },
  dotOff: {
    backgroundColor: theme.colors.muted,
  },
  dotCaption: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.mutedText,
  },
  twoCol: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.mutedText,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.text,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  liveText: {
    fontSize: 11,
    color: theme.colors.chart3,
    fontWeight: "500",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
  },
  mutedSmall: {
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  mutedSmallBold: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  progressTrack: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: theme.colors.muted,
    marginTop: 8,
  },
  progressFill: {
    backgroundColor: theme.colors.primary,
    minWidth: 0,
  },
  taskFooter: {
    flexDirection: "row",
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  taskFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendRow: {
    flexDirection: "row",
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chartArea: {
    minHeight: 140,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingTop: theme.spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  barStack: {
    width: "100%",
    height: CHART_INNER_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFillSolid: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: theme.colors.mutedText,
  },
  topicList: {
    gap: theme.spacing.sm,
  },
  topicRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topicLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  topicDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  topicName: {
    fontSize: 14,
    color: theme.colors.text,
  },
  topicValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
});
