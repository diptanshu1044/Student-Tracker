import { Types } from "mongoose";
import { UserProblemModel } from "../../models/user-problem.model";
import { safeRedisGet, safeRedisSet } from "../../database/redis";
import { CACHE_KEYS } from "../../shared/constants/cache-keys";

const CACHE_TTL_SECONDS = 300;

export async function getWeeklySolved(userId: string) {
  const cacheKey = CACHE_KEYS.weeklySolved(userId);
  const cached = await safeRedisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const result = await UserProblemModel.aggregate([
    { $match: { userId: new Types.ObjectId(userId), status: "solved" } },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: "$createdAt" },
          week: { $isoWeek: "$createdAt" }
        },
        solvedCount: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.week": 1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        week: "$_id.week",
        solvedCount: 1
      }
    }
  ]);

  await safeRedisSet(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);
  return result;
}

export async function getTopicBreakdown(userId: string) {
  return UserProblemModel.aggregate([
    { $match: { userId: new Types.ObjectId(userId), status: "solved" } },
    {
      $lookup: {
        from: "problems",
        localField: "problemId",
        foreignField: "_id",
        as: "problem"
      }
    },
    { $unwind: "$problem" },
    {
      $group: {
        _id: "$problem.topic",
        solvedCount: { $sum: 1 }
      }
    },
    { $sort: { solvedCount: -1 } },
    {
      $project: {
        _id: 0,
        topic: "$_id",
        solvedCount: 1
      }
    }
  ]);
}

export async function getWeakTopics(userId: string) {
  return UserProblemModel.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "problems",
        localField: "problemId",
        foreignField: "_id",
        as: "problem"
      }
    },
    { $unwind: "$problem" },
    {
      $group: {
        _id: "$problem.topic",
        reviseCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "revise"] }, 1, 0]
          }
        },
        solvedCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "solved"] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        topic: "$_id",
        weaknessScore: { $subtract: ["$reviseCount", "$solvedCount"] },
        reviseCount: 1,
        solvedCount: 1
      }
    },
    { $sort: { weaknessScore: -1 } },
    { $limit: 10 }
  ]);
}
