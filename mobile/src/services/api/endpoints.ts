export const moduleEndpoints = {
  dsa: "/dsa/problems",
  applications: "/applications",
  planner: "/planner/tasks-v2",
  jobs: "/jobs",
  resume: "/resume",
} as const;

export const dashboardSources = [
  "/analytics/streak",
  "/analytics/weekly-solved",
  "/analytics/topic-breakdown",
  "/analytics/weak-topics",
  "/dsa/stats",
  "/dsa/activity",
  "/dsa/weak-topics",
  "/jobs/stats",
  "/jobs/funnel",
  "/jobs/insights",
  "/resume/stats",
  "/resume/compare",
  "/planner/tasks-v2?limit=5&page=1",
] as const;
