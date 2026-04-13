import { Types } from "mongoose";
import { ProblemModel } from "../../models/problem.model";
import { UserProblemModel } from "../../models/user-problem.model";
import { getPagination } from "../../shared/utils/pagination";

interface ListInput {
  userId: string;
  page?: number;
  limit?: number;
  status?: "solved" | "revise";
}

interface TrackInput {
  userId: string;
  problemId: string;
  status: "solved" | "revise";
  attempts?: number;
  lastSolvedAt?: string;
}

export async function listProblems(page?: number, limit?: number) {
  const paging = getPagination({ page, limit });
  const [items, total] = await Promise.all([
    ProblemModel.find().sort({ topic: 1, title: 1 }).skip(paging.skip).limit(paging.limit),
    ProblemModel.countDocuments()
  ]);

  return {
    items,
    total,
    page: paging.page,
    limit: paging.limit
  };
}

export async function listUserProblems(input: ListInput) {
  const paging = getPagination({ page: input.page, limit: input.limit });
  const query: Record<string, unknown> = { userId: new Types.ObjectId(input.userId) };

  if (input.status) {
    query.status = input.status;
  }

  const [items, total] = await Promise.all([
    UserProblemModel.find(query)
      .populate("problemId")
      .sort({ createdAt: -1 })
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
  const update = {
    status: input.status,
    attempts: input.attempts ?? 1,
    lastSolvedAt: input.lastSolvedAt ? new Date(input.lastSolvedAt) : undefined
  };

  return UserProblemModel.findOneAndUpdate(
    {
      userId: new Types.ObjectId(input.userId),
      problemId: new Types.ObjectId(input.problemId)
    },
    {
      $set: update,
      $setOnInsert: {
        userId: new Types.ObjectId(input.userId),
        problemId: new Types.ObjectId(input.problemId)
      }
    },
    {
      upsert: true,
      new: true
    }
  );
}
