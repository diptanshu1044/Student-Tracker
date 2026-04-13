export const CACHE_KEYS = {
  analyticsSummary: (userId: string) => `analytics:summary:${userId}`,
  weeklySolved: (userId: string) => `analytics:weekly-solved:${userId}`,
  streak: (userId: string) => `streak:${userId}`
};
