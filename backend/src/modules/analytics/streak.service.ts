import { Types } from "mongoose";
import { UserProblemModel } from "../../models/user-problem.model";
import { safeRedisGet, safeRedisSet } from "../../database/redis";
import { CACHE_KEYS } from "../../shared/constants/cache-keys";

interface Streak {
  currentStreak: number;
  lastActiveDate: string | null;
}

export async function getStreak(userId: string): Promise<Streak> {
  const cacheKey = CACHE_KEYS.streak(userId);
  const cached = await safeRedisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached) as Streak;
  }

  const days = await UserProblemModel.aggregate([
    { $match: { userId: new Types.ObjectId(userId), status: "solved" } },
    {
      $project: {
        day: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt"
          }
        }
      }
    },
    { $group: { _id: "$day" } },
    { $sort: { _id: -1 } }
  ]);

  const solvedDays = days.map((d) => d._id as string);
  let streak = 0;

  if (solvedDays.length > 0) {
    const start = new Date(solvedDays[0]);
    for (let i = 0; i < solvedDays.length; i += 1) {
      const expected = new Date(start);
      expected.setDate(start.getDate() - i);
      const iso = expected.toISOString().slice(0, 10);
      if (solvedDays[i] === iso) {
        streak += 1;
      } else {
        break;
      }
    }
  }

  const response: Streak = {
    currentStreak: streak,
    lastActiveDate: solvedDays[0] ?? null
  };

  await safeRedisSet(cacheKey, JSON.stringify(response), 24 * 60 * 60);
  return response;
}
