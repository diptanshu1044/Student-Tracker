import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import { ProblemModel } from "../../models/problem.model";
import { UserProblemModel } from "../../models/user-problem.model";
import { getPagination } from "../../shared/utils/pagination";
import { AppError } from "../../shared/utils/app-error";

type ProblemStatus = "solved" | "attempted" | "revision" | "revise";

interface ListTrackedProblemsInput {
  userId: string;
  page?: number;
  limit?: number;
  difficulty?: "easy" | "medium" | "hard";
  topic?: string;
  status?: ProblemStatus;
  search?: string;
}

interface TrackInput {
  userId: string;
  problemId: string;
  status: ProblemStatus;
  attempts?: number;
  date?: string;
  notes?: string;
}

interface UpdateUserProblemInput {
  id: string;
  userId: string;
  status?: ProblemStatus;
  attempts?: number;
  date?: string;
  notes?: string;
}

function normalizeStatus(status: ProblemStatus): "solved" | "attempted" | "revision" {
  if (status === "revise") {
    return "revision";
  }
  return status;
}

function resolveStatusByPriority(
  currentStatus: ProblemStatus,
  nextStatus: ProblemStatus
): "solved" | "attempted" | "revision" {
  const priority: Record<"solved" | "attempted" | "revision", number> = {
    solved: 3,
    attempted: 2,
    revision: 1
  };

  const current = normalizeStatus(currentStatus);
  const next = normalizeStatus(nextStatus);
  return priority[next] > priority[current] ? next : current;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function listProblemCatalog(page?: number, limit?: number) {
  const paging = getPagination({ page, limit });
  const [items, total] = await Promise.all([
    ProblemModel.find().sort({ topic: 1, title: 1 }).skip(paging.skip).limit(paging.limit),
    ProblemModel.countDocuments()
  ]);

  return {
    items,
    page: paging.page,
    total,
    limit: paging.limit
  };
}

export async function listTrackedProblems(input: ListTrackedProblemsInput) {
  const paging = getPagination({ page: input.page, limit: input.limit });
  const userId = new Types.ObjectId(input.userId);
  const query: Record<string, unknown> = { userId };

  if (input.status) {
    query.status = normalizeStatus(input.status);
  }

  if (input.topic || input.difficulty || input.search) {
    const problemQuery: Record<string, unknown> = {};

    if (input.topic) {
      problemQuery.topic = input.topic;
    }

    if (input.difficulty) {
      problemQuery.difficulty = input.difficulty;
    }

    if (input.search) {
      problemQuery.title = { $regex: escapeRegExp(input.search), $options: "i" };
    }

    const matchingProblems = await ProblemModel.find(problemQuery).select("_id").lean();
    if (matchingProblems.length === 0) {
      return {
        items: [],
        total: 0,
        page: paging.page,
        limit: paging.limit
      };
    }

    query.problemId = { $in: matchingProblems.map((problem) => problem._id) };
  }

  const [items, total] = await Promise.all([
    UserProblemModel.find(query)
      .populate("problemId")
      .sort({ date: -1, updatedAt: -1 })
      .skip(paging.skip)
      .limit(paging.limit),
    UserProblemModel.countDocuments(query)
  ]);

  return {
    items,
    total,
    page: paging.page,
    limit: paging.limit
  };
}

export async function trackProblem(input: TrackInput) {
  const userId = new Types.ObjectId(input.userId);
  const problemId = new Types.ObjectId(input.problemId);
  const attemptsToAdd = Math.max(1, input.attempts ?? 1);
  const status = normalizeStatus(input.status);
  const date = input.date ? new Date(input.date) : new Date();
  const note = input.notes?.trim();

  const problemExists = await ProblemModel.exists({ _id: problemId });
  if (!problemExists) {
    throw new AppError("Problem not found", StatusCodes.NOT_FOUND);
  }

  const existing = await UserProblemModel.findOne({ userId, problemId });

  if (!existing) {
    return UserProblemModel.create({
      userId,
      problemId,
      status,
      attempts: attemptsToAdd,
      notes: note ? [note] : [],
      date,
      lastSolvedAt: status === "solved" ? date : undefined
    });
  }

  existing.attempts += attemptsToAdd;
  existing.status = resolveStatusByPriority(existing.status, status);
  existing.date = date;
  if (note) {
    existing.notes.push(note);
  }

  if (existing.status === "solved") {
    existing.lastSolvedAt = date;
  }

  await existing.save();
  await existing.populate("problemId");
  return existing;
}

export async function getActivity(userId: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setUTCDate(endDate.getUTCDate() - 179);
  startDate.setUTCHours(0, 0, 0, 0);

  const buckets = await UserProblemModel.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date"
          }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const byDate = new Map<string, number>();
  for (const bucket of buckets) {
    byDate.set(bucket._id, bucket.count);
  }

  const result: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < 180; i += 1) {
    const day = new Date(startDate);
    day.setUTCDate(startDate.getUTCDate() + i);
    const key = toIsoDay(day);
    result.push({ date: key, count: byDate.get(key) ?? 0 });
  }

  return result;
}

export async function getWeakTopics(userId: string) {
  const rows = await UserProblemModel.aggregate<{
    topic: string;
    totalAttempts: number;
    totalSolved: number;
    totalProblems: number;
    solveRate: number;
    avgAttempts: number;
    score: number;
  }>([
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
        totalAttempts: { $sum: "$attempts" },
        totalSolved: {
          $sum: {
            $cond: [{ $eq: ["$status", "solved"] }, 1, 0]
          }
        },
        totalProblems: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        topic: "$_id",
        totalAttempts: 1,
        totalSolved: 1,
        totalProblems: 1,
        solveRate: {
          $cond: [{ $eq: ["$totalProblems", 0] }, 0, { $divide: ["$totalSolved", "$totalProblems"] }]
        },
        avgAttempts: {
          $cond: [{ $eq: ["$totalProblems", 0] }, 0, { $divide: ["$totalAttempts", "$totalProblems"] }]
        }
      }
    },
    {
      $addFields: {
        score: {
          $multiply: [{ $subtract: [1, "$solveRate"] }, "$avgAttempts"]
        }
      }
    },
    { $sort: { score: -1 } },
    { $limit: 5 }
  ]);

  return rows;
}

export async function getStats(userId: string) {
  const uid = new Types.ObjectId(userId);
  const [totalSolved, totalAttempted, totalProblems] = await Promise.all([
    UserProblemModel.countDocuments({ userId: uid, status: "solved" }),
    UserProblemModel.countDocuments({ userId: uid, status: { $in: ["attempted", "revision", "revise"] } }),
    UserProblemModel.countDocuments({ userId: uid })
  ]);

  const solvedDaysRows = await UserProblemModel.aggregate<{ day: string }>([
    { $match: { userId: uid, status: "solved" } },
    {
      $project: {
        day: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date"
          }
        }
      }
    },
    { $group: { _id: "$day" } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, day: "$_id" } }
  ]);

  const solvedDays = solvedDaysRows.map((row) => row.day);

  let currentStreak = 0;
  if (solvedDays.length > 0) {
    const latest = new Date(solvedDays[solvedDays.length - 1]);
    for (let i = solvedDays.length - 1; i >= 0; i -= 1) {
      const expected = new Date(latest);
      expected.setUTCDate(latest.getUTCDate() - (solvedDays.length - 1 - i));
      if (solvedDays[i] === toIsoDay(expected)) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of solvedDays) {
    if (!prev) {
      run = 1;
    } else {
      const prevDate = new Date(prev);
      prevDate.setUTCDate(prevDate.getUTCDate() + 1);
      run = toIsoDay(prevDate) === day ? run + 1 : 1;
    }

    if (run > longestStreak) {
      longestStreak = run;
    }
    prev = day;
  }

  return {
    totalSolved,
    totalAttempted,
    totalProblems,
    currentStreak,
    longestStreak
  };
}

export async function updateTrackedProblem(input: UpdateUserProblemInput) {
  const userId = new Types.ObjectId(input.userId);
  const item = await UserProblemModel.findOne({
    _id: new Types.ObjectId(input.id),
    userId
  });

  if (!item) {
    throw new AppError("Problem log not found", StatusCodes.NOT_FOUND);
  }

  if (input.status) {
    item.status = normalizeStatus(input.status);
  }

  if (input.attempts !== undefined) {
    item.attempts = input.attempts;
  }

  if (input.date) {
    item.date = new Date(input.date);
  }

  const note = input.notes?.trim();
  if (note) {
    item.notes.push(note);
  }

  if (item.status === "solved") {
    item.lastSolvedAt = item.date;
  }

  await item.save();
  await item.populate("problemId");
  return item;
}

export async function deleteTrackedProblem(id: string, userId: string) {
  const deleted = await UserProblemModel.findOneAndDelete({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId)
  });

  if (!deleted) {
    throw new AppError("Problem log not found", StatusCodes.NOT_FOUND);
  }

  return { deleted: true };
}
